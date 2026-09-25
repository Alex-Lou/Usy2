import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { ApiError } from "../../lib/api/client";
import { useAuth } from "../auth/useAuth";
import type { Widget } from "../profile/types";
import { isWideMini, MiniWidget } from "../profile/widgets/MiniWidget";
import { cleanWidget, missingImage, WidgetListEditor } from "../profile/widgets/WidgetEditor";
import { onCoupleActivity } from "./activity";
import { getSharedWidgets, saveSharedWidgets } from "./api";
import { copiesOfLinked } from "./linked";
import type { LinkedWidget } from "./types";

/**
 * "Nos widgets": the side menu's widgets, the same for both, and both can edit
 * them. If the other person saves meanwhile, nothing is overwritten: this page
 * says so and offers to reload.
 */
export function SharedWidgetsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [widgets, setWidgets] = useState<Widget[] | null>(null);
  const [linked, setLinked] = useState<LinkedWidget[]>([]);
  const [version, setVersion] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [changedBy, setChangedBy] = useState<string | null>(null); // the other person saved meanwhile
  const dirtyRef = useRef(false);
  dirtyRef.current = dirty;

  const load = useCallback(() => {
    getSharedWidgets()
      .then((s) => {
        setWidgets(s.widgets);
        setLinked(s.linked ?? []);
        setVersion(s.version);
        setDirty(false);
        setChangedBy(null);
      })
      .catch(() => setError("Chargement impossible."));
  }, []);

  useEffect(() => {
    load();
    return onCoupleActivity((a) => {
      if (a.kind !== "widgets") return;
      if (a.actorId === user?.id) {
        // My own profile changed what it shows here: refresh that part only.
        getSharedWidgets().then((s) => setLinked(s.linked ?? [])).catch(() => {});
        return;
      }
      if (dirtyRef.current) setChangedBy(a.actorName); // keep what is being typed
      else load();
    });
  }, [load, user?.id]);

  const isCopy = copiesOfLinked(linked);

  function edit(update: (list: Widget[]) => Widget[]) {
    setWidgets((list) => update(list ?? []));
    setDirty(true);
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
      const saved = await saveSharedWidgets(widgets.map(cleanWidget), version);
      setWidgets(saved.widgets);
      setLinked(saved.linked ?? []);
      setVersion(saved.version);
      setDirty(false);
      setChangedBy(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) setChangedBy((who) => who ?? "L'autre");
      else setError(err instanceof ApiError ? err.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_16rem]">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Nos widgets</h1>
          <p className="text-sm text-text-muted">Ceux de la barre latérale : les mêmes pour vous deux, et chacun peut les modifier.</p>
        </div>

        {changedBy && (
          <div role="status" className="flex flex-wrap items-center gap-2 rounded-token border border-primary/40 bg-primary/10 p-3 text-sm">
            <span>{changedBy} vient de modifier les widgets.</span>
            <button type="button" onClick={load} className="chip press hover:border-primary/50">Voir sa version</button>
            <span className="text-xs text-text-muted">(tes changements non enregistrés seront perdus)</span>
          </div>
        )}

        <section className="card p-4">
          {widgets ? (
            <WidgetListEditor
              widgets={widgets}
              onChange={edit}
              onError={setError}
              footer={(w) =>
                isCopy(cleanWidget(w)) && (
                  <p className="mt-2 text-xs text-primary">
                    Doublon : ce widget est déjà montré depuis un profil (voir « Depuis vos profils »). Tu peux le supprimer ici.
                  </p>
                )
              }
            />
          ) : (
            <div className="h-24 animate-pulse rounded-token bg-border/50" />
          )}
        </section>

        {linked.length > 0 && (
          <section className="card flex flex-col gap-2 p-4" aria-label="Depuis vos profils">
            <h2 className="font-semibold">Depuis vos profils</h2>
            <p className="text-xs text-text-muted">Montrés ici par leur auteur, tant qu'ils sont sur son profil. Seul lui peut les retirer.</p>
            <ul className="flex flex-col gap-2">
              {linked.map((l, i) => (
                <li key={i} className="flex items-center gap-3 rounded-token border border-border p-2">
                  <div className="w-32 shrink-0">
                    <MiniWidget widget={l.widget} />
                  </div>
                  <span className="flex-1 text-sm text-text-muted">De {l.ownerName}</span>
                  {l.ownerId === user?.id && (
                    <Link to="/profile/edit" className="chip press text-xs hover:border-primary/50">
                      Gérer sur mon profil
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {error && <p role="alert" className="text-sm text-danger">{error}</p>}

        <div className="flex gap-2">
          <Button onClick={save} disabled={saving || !dirty || !!changedBy}>{saving ? "Enregistrement…" : "Enregistrer"}</Button>
          <Button variant="surface" onClick={() => navigate(-1)}>Retour</Button>
        </div>
      </div>

      <div className="lg:sticky lg:top-8 lg:self-start">
        <p className="mb-2 text-sm text-text-muted">Aperçu</p>
        <div className="card grid grid-cols-2 gap-2 p-3">
          {widgets && widgets.length + linked.length > 0 ? (
            [...widgets.filter((w) => !isCopy(w)), ...linked.map((l) => l.widget)].map((w, i) => (
              <div key={i} className={`min-w-0 ${isWideMini(w) ? "col-span-2" : ""}`}>
                <MiniWidget widget={w} />
              </div>
            ))
          ) : (
            <p className="col-span-2 text-xs text-text-muted">Rien pour l'instant.</p>
          )}
        </div>
      </div>
    </div>
  );
}
