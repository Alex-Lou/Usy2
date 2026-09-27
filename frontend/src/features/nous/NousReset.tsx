import { AnimatePresence, motion } from "motion/react";
import { useState, type ReactNode } from "react";
import { ApiError } from "../../lib/api/client";
import { acceptReset, dropReset, proposeReset, resetMine, type NousResetState, type NousTheme } from "./api";

const scopeLabel = (themes: NousTheme[], theme: string | null) => {
  const t = theme ? themes.find((x) => x.id === theme) : null;
  return t ? `la catégorie ${t.emoji} ${t.label}` : "toutes les catégories";
};

/**
 * 🔄 Starting again: my own answers (a theme or all), right after a
 * confirmation; or for both of us, as a proposal the other one accepts.
 */
export function ResetPanel({ themes, partnerName, pending, onDone }: {
  themes: NousTheme[];
  partnerName: string;
  pending: NousResetState | null;
  onDone: () => void;
}) {
  const [theme, setTheme] = useState<string>("");
  const [ask, setAsk] = useState<"mine" | "both" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const scope = scopeLabel(themes, theme || null);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      if (ask === "mine") {
        await resetMine(theme || null);
        setDone(`C'est fait : tes réponses de ${scope} repartent de zéro ✨`);
      } else {
        await proposeReset(theme || null);
        setDone(`Proposition envoyée à ${partnerName} 💌 Rien n'est effacé tant que ${partnerName} n'a pas dit oui.`);
      }
      setAsk(null);
      onDone();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Impossible pour l'instant, réessaie.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card flex flex-col gap-3 p-4" aria-label="Repartir de zéro" data-nous-reset="">
      <div>
        <h3 className="font-display text-lg font-bold">🔄 Repartir de zéro</h3>
        <p className="text-xs text-text-muted">Les ⭐ favoris et les « on en a parlé » restent toujours.</p>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs font-semibold text-text-muted">Quelle partie ?</span>
        <select value={theme} onChange={(e) => setTheme(e.target.value)} className="rounded-token border border-border bg-surface-2 px-3 py-2">
          <option value="">Toutes les catégories</option>
          {themes.map((t) => <option key={t.id} value={t.id}>{t.emoji} {t.label}</option>)}
        </select>
      </label>
      <div className="grid gap-2 sm:grid-cols-2">
        <button type="button" onClick={() => { setDone(null); setAsk("mine"); }} className="chip press justify-center py-2 text-sm font-semibold">
          🙋 Pour moi seulement
        </button>
        <button type="button" disabled={pending != null} onClick={() => { setDone(null); setAsk("both"); }} className="chip press justify-center py-2 text-sm font-semibold disabled:opacity-40">
          💞 Pour nous deux
        </button>
      </div>
      {pending && <p className="text-xs text-text-muted">Une proposition est déjà en cours (voir en haut de la page).</p>}
      {done && <p className="qz-pop text-sm font-semibold text-primary" role="status">{done}</p>}

      <ConfirmSheet
        open={ask !== null}
        title={ask === "mine" ? "Effacer tes réponses ?" : `Proposer à ${partnerName} de repartir de zéro ?`}
        confirm={ask === "mine" ? "Oui, effacer" : "Envoyer la proposition"}
        danger={ask === "mine"}
        busy={busy}
        error={error}
        onConfirm={() => void run()}
        onCancel={() => { setAsk(null); setError(null); }}
      >
        {ask === "mine" ? (
          <ul className="list-disc space-y-1 pl-5">
            <li>Tes réponses de <b>{scope}</b>,</li>
            <li>les devinettes de {partnerName} sur ces réponses, avec leurs verdicts et petits mots,</li>
            <li>et tes devinettes sur les siennes dans {scope}.</li>
          </ul>
        ) : (
          <p>
            Si {partnerName} dit oui, vos réponses, devinettes et verdicts de <b>{scope}</b> seront effacés <b>pour vous deux</b>.
            Tant que {partnerName} n'a pas répondu, rien ne bouge.
          </p>
        )}
        {ask === "mine" && <p className="mt-2 font-semibold">Impossible de revenir en arrière.</p>}
      </ConfirmSheet>
    </section>
  );
}

/** The proposal waiting for an answer, shown at the top of the page: mine (take it back) or theirs (yes / no). */
export function ResetBanner({ reset, themes, partnerName, onDone }: {
  reset: NousResetState;
  themes: NousTheme[];
  partnerName: string;
  onDone: () => void;
}) {
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scope = scopeLabel(themes, reset.theme);
  const act = async (call: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await call();
      setAsking(false);
      onDone();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Impossible pour l'instant, réessaie.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.section initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="card flex flex-col gap-2 border-2 border-primary/60 p-4" role="status" data-nous-reset-banner="">
      {reset.mine ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span>⏳ Tu as proposé de repartir de zéro ({scope}). {partnerName} n'a pas encore répondu.</span>
          <button type="button" disabled={busy} onClick={() => void act(dropReset)} className="chip press ml-auto text-sm">Retirer</button>
        </div>
      ) : (
        <>
          <p className="text-sm">
            🔄 <b>{reset.byName}</b> propose de repartir de zéro : <b>{scope}</b>. Vos réponses, devinettes et verdicts de cette partie seraient effacés pour vous deux.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={() => setAsking(true)} className="btn-brand press rounded-token px-3 py-1.5 text-sm font-semibold">Oui, on repart de zéro</button>
            <button type="button" disabled={busy} onClick={() => void act(dropReset)} className="chip press text-sm">Non, on garde tout</button>
          </div>
        </>
      )}
      {error && !asking && <p className="text-xs text-danger" role="alert">{error}</p>}
      <ConfirmSheet
        open={asking}
        title="Vraiment tout effacer ?"
        confirm="Oui, effacer pour nous deux"
        danger
        busy={busy}
        error={error}
        onConfirm={() => void act(acceptReset)}
        onCancel={() => { setAsking(false); setError(null); }}
      >
        <p>Vos réponses, devinettes et verdicts de <b>{scope}</b> seront effacés pour vous deux. Impossible de revenir en arrière.</p>
      </ConfirmSheet>
    </motion.section>
  );
}

/** A confirmation sheet: what is about to happen, and a clear yes or no. */
function ConfirmSheet({ open, title, confirm, danger, busy, error, onConfirm, onCancel, children }: {
  open: boolean;
  title: string;
  confirm: string;
  danger?: boolean;
  busy: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
  children: ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center lg:pl-64" onClick={onCancel}>
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="card flex w-full max-w-md flex-col gap-3 p-5"
          >
            <h3 className="font-display text-lg font-bold">{title}</h3>
            <div className="text-sm">{children}</div>
            {error && <p className="text-sm text-danger" role="alert">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onCancel} disabled={busy} className="chip press text-sm" autoFocus>Annuler</button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={busy}
                className={"press rounded-token px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 " + (danger ? "bg-danger" : "btn-brand")}
              >
                {busy ? "…" : confirm}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
