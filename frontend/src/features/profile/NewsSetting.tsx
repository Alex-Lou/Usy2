import { useEffect, useState } from "react";
import { getNewsPrefs, saveNewsPrefs, type NewsPrefs } from "../news/api";

/**
 * 📰 "Actus", for me only: off, the feed is just ours; on, a second tab
 * appears in MY feed with the sources I pick there. The other person's feed
 * never changes.
 */
export function NewsSetting() {
  const [prefs, setPrefs] = useState<NewsPrefs | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getNewsPrefs().then(setPrefs).catch(() => setError("Réglage indisponible pour le moment."));
  }, []);

  async function toggle() {
    if (!prefs) return;
    setBusy(true);
    setError(null);
    try {
      setPrefs(await saveNewsPrefs({ ...prefs, enabled: !prefs.enabled }));
    } catch {
      setError("Enregistrement impossible.");
    } finally {
      setBusy(false);
    }
  }

  const on = !!prefs?.enabled;
  return (
    <section className="card flex flex-col gap-3 p-4" aria-label="Actus">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">📰 Pour toi : onglet Actus dans ton fil</h2>
          <p className="text-xs text-text-muted">
            Articles de sites geek et posts publics (Bluesky, Mastodon, Reddit, X), dans un second onglet de <strong>ton</strong> fil seulement. Votre fil à deux ne change pas.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="Onglet Actus dans mon fil"
          onClick={toggle}
          disabled={!prefs || busy}
          className={"relative mt-1 h-7 w-12 shrink-0 rounded-full border transition press disabled:opacity-50 " + (on ? "border-primary btn-brand" : "border-border bg-surface-2")}
        >
          <span className={"absolute top-0.5 rounded-full bg-white shadow transition-all " + (on ? "left-[1.45rem]" : "left-0.5")} style={{ width: 22, height: 22 }} />
        </button>
      </div>
      {on && <p className="text-xs text-primary">C'est activé : choisis tes sources dans le fil, onglet « 📰 Actus ».</p>}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </section>
  );
}
