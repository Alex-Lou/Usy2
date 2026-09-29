import { useState } from "react";
import { Button } from "../../components/ui/Button";
import { apiRequest, apiUrl } from "../../lib/api/client";

/**
 * « Nos souvenirs » : everything in the app as one ZIP (messages, posts, notes,
 * lists, dates, albums… and every photo, voice message and document). The
 * server hands a single-use link, and the browser downloads it directly
 * (a big file never sits in the page's memory).
 */
export function ExportSetting() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setBusy(true);
    setError(null);
    try {
      const { url } = await apiRequest<{ url: string }>("/api/export/link", { method: "POST" });
      window.location.href = apiUrl(url);
    } catch {
      setError("Téléchargement impossible pour le moment. Réessaie dans un instant.");
    } finally {
      window.setTimeout(() => setBusy(false), 3000); // the download starts in the background
    }
  }

  return (
    <section className="card flex flex-col gap-3 p-4" aria-label="Nos souvenirs">
      <div>
        <h2 className="font-semibold">💾 Nos souvenirs : tout télécharger</h2>
        <p className="text-xs text-text-muted">
          Un fichier .zip avec tout ce qu'on a mis dans l'appli : messages, posts, commentaires, mots, humeurs, listes, dates,
          albums, jeux… et toutes les photos, notes vocales et documents. À garder bien au chaud 🔒 (pas de mots de passe dedans).
        </p>
      </div>
      <Button onClick={download} disabled={busy} className="self-start">
        {busy ? "Préparation…" : "Tout télécharger (.zip)"}
      </Button>
      {busy && <p className="text-xs text-text-muted">Le téléchargement démarre ; avec beaucoup de photos, il peut prendre une minute.</p>}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </section>
  );
}
