import { useState } from "react";
import { useAuth } from "../auth/useAuth";
import { ApiError, apiRequest } from "../../lib/api/client";

// Tailwind's opacity modifiers don't apply to the CSS-variable colours: mix by hand.
const RED_BORDER = { borderColor: "color-mix(in srgb, var(--color-danger) 55%, transparent)" };
const RED_TINT = { background: "color-mix(in srgb, var(--color-danger) 8%, var(--color-surface))" };

/**
 * "Pour moi", at the very bottom: log this account out of every device (a lost
 * or stolen phone). The server refuses all its current connections, closes the
 * live ones and stops its notifications; this device is logged out too.
 */
export function DangerZone() {
  const { logout } = useAuth();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function logoutEverywhere() {
    setBusy(true);
    setError(null);
    try {
      await apiRequest("/api/auth/logout-all", { method: "POST" });
      logout();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Impossible pour l'instant. Réessaie.");
      setBusy(false);
    }
  }

  return (
    <section className="card flex flex-col gap-3 border-2 p-4" style={{ ...RED_BORDER, ...RED_TINT }} aria-label="Zone rouge">
      <div>
        <h2 className="flex items-center gap-2 font-semibold text-danger">
          <span className="mc-emoji" aria-hidden="true">⛔</span> Zone rouge
        </h2>
        <p className="text-xs text-text-muted">
          Téléphone perdu ou volé ? Déconnecte ton compte de tous les appareils, celui-ci compris. Les notifications s'arrêtent partout ;
          il suffira de te reconnecter avec ton mot de passe. Ton binôme n'est pas touché.
        </p>
      </div>
      {asking ? (
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Confirmer">
          <span className="text-sm font-semibold">Vraiment tout déconnecter ?</span>
          <button
            type="button"
            onClick={logoutEverywhere}
            disabled={busy}
            className="rounded-token border-2 border-danger bg-danger px-3 py-1.5 text-sm font-semibold text-white press disabled:opacity-60"
          >
            {busy ? "…" : "Oui, partout"}
          </button>
          <button type="button" onClick={() => setAsking(false)} disabled={busy} className="chip press text-sm">
            Annuler
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAsking(true)}
          className="self-start rounded-token border-2 border-danger px-3 py-1.5 text-sm font-semibold text-danger press"
        >
          Déconnecter tous mes appareils
        </button>
      )}
      {error && <p role="alert" className="text-xs text-danger">{error}</p>}
    </section>
  );
}
