import { useCallback, useEffect, useRef, useState } from "react";
import { AssetImage } from "../../components/AssetImage";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { PageHeader } from "../../components/ui/PageHeader";
import { ApiError } from "../../lib/api/client";
import { uploadImage } from "../../lib/api/assets";
import { feel } from "../../lib/feel";
import { useOnRefresh } from "../../lib/refresh";
import { onCoupleActivity } from "../couple/activity";
import { getChallenge, getHistory, playJoker, postEntry, type ChallengeEntry, type ChallengeWeek, type PastWeek } from "./api";

function weekLabel(monday: string): string {
  const [y, m, d] = monday.split("-").map(Number);
  const start = new Date(y, m - 1, d);
  return "Semaine du " + start.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}

function Photo({ entry }: { entry: ChallengeEntry }) {
  return (
    <figure className="flex flex-col gap-1">
      <div className="aspect-square overflow-hidden rounded-token bg-surface-2">
        <AssetImage assetId={entry.assetId} className="h-full w-full object-cover" />
      </div>
      <figcaption className="text-sm">
        <span className="font-semibold">{entry.authorName}</span>
        {entry.caption && <span className="text-text-muted"> · {entry.caption}</span>}
      </figcaption>
    </figure>
  );
}

/**
 * 📸 Défi photo de la semaine: the theme, my photo (to post or replace), the
 * other one's (secret until mine is posted), then the past weeks.
 */
export function ChallengePage() {
  const [week, setWeek] = useState<ChallengeWeek | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [jokerOpen, setJokerOpen] = useState(false);
  const [jokerText, setJokerText] = useState("");
  const [past, setPast] = useState<PastWeek[]>([]);
  const [pastPage, setPastPage] = useState(0);
  const [pastMore, setPastMore] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    getChallenge()
      .then(setWeek)
      .catch(() => setError("Le défi n'a pas pu se charger."));
    getHistory(0)
      .then((p) => {
        setPast(p.content);
        setPastPage(0);
        setPastMore(p.totalPages > 1);
      })
      .catch(() => {});
  }, []);
  useEffect(load, [load]);
  useOnRefresh(load);
  // The other one posted: their photo (or "posted, secret") shows without reloading.
  useEffect(() => onCoupleActivity((a) => a.kind.startsWith("challenge-") && getChallenge().then(setWeek).catch(() => {})), []);

  async function send(f: File) {
    setBusy(true);
    setError(null);
    try {
      const asset = await uploadImage(f);
      setWeek(await postEntry(asset.id, caption.trim() || null));
      setCaption("");
      feel.love();
    } catch {
      setError("La photo n'a pas pu être envoyée.");
    } finally {
      setBusy(false);
    }
  }

  async function joker() {
    setBusy(true);
    setError(null);
    try {
      setWeek(await playJoker(jokerText));
      setJokerOpen(false);
      setJokerText("");
    } catch (e) {
      setError(e instanceof ApiError && e.status === 409 ? e.message : "Le thème n'a pas pu changer.");
    } finally {
      setBusy(false);
    }
  }

  function more() {
    const next = pastPage + 1;
    getHistory(next)
      .then((p) => {
        setPast((list) => [...list, ...p.content]);
        setPastPage(next);
        setPastMore(next + 1 < p.totalPages);
      })
      .catch(() => {});
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="📸 Défi photo" subtitle="Un thème par semaine, une photo chacun." />

      {!week ? (
        <p className="text-center text-sm text-text-muted">{error ?? "Chargement…"}</p>
      ) : (
        <section className="card flex flex-col gap-4 p-4 animate-fade-up">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{weekLabel(week.weekStart)}</p>
            <h2 className="mt-1 font-display text-2xl font-bold">« {week.theme} »</h2>
            {week.themeBy && <p className="text-xs text-text-muted">thème choisi par {week.themeBy}</p>}
            {week.jokerAvailable && !jokerOpen && (
              <button type="button" onClick={() => setJokerOpen(true)} className="mt-2 text-sm text-primary underline-offset-2 hover:underline">
                🎲 Joker : choisir un autre thème
              </button>
            )}
            {jokerOpen && (
              <div className="mt-3 flex gap-2">
                <Input value={jokerText} onChange={(e) => setJokerText(e.target.value)} maxLength={80} placeholder="Ton thème pour cette semaine" autoFocus />
                <Button onClick={joker} disabled={busy || !jokerText.trim()} className="shrink-0 !px-3 text-sm">
                  OK
                </Button>
                <Button variant="surface" onClick={() => setJokerOpen(false)} className="shrink-0 !px-3 text-sm">
                  ✕
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              {week.mine ? (
                <Photo entry={week.mine} />
              ) : (
                <button
                  type="button"
                  onClick={() => file.current?.click()}
                  disabled={busy}
                  className="grid aspect-square place-items-center rounded-token border-2 border-dashed border-border text-center text-sm text-text-muted press hover:border-primary/60 disabled:opacity-60"
                >
                  <span>
                    <span className="block text-3xl">📷</span>
                    {busy ? "Envoi…" : "Ta photo"}
                  </span>
                </button>
              )}
            </div>
            <div className="flex flex-col gap-2">
              {week.theirs ? (
                <Photo entry={week.theirs} />
              ) : (
                <div className="grid aspect-square place-items-center rounded-token bg-surface-2 p-3 text-center text-sm text-text-muted">
                  <span>
                    <span className="block text-3xl">{week.theirsPosted ? "🔒" : "⏳"}</span>
                    {week.theirsPosted ? "Sa photo t'attend : poste la tienne pour la voir" : "Pas encore de photo de l'autre côté"}
                  </span>
                </div>
              )}
            </div>
          </div>

          {!week.mine && (
            <Input value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={200} placeholder="Une légende ? (facultatif)" />
          )}
          {week.mine && (
            <button type="button" onClick={() => file.current?.click()} disabled={busy} className="self-center text-sm text-text-muted underline-offset-2 hover:underline">
              {busy ? "Envoi…" : "Changer ma photo"}
            </button>
          )}
          {error && <p className="text-center text-sm text-danger">{error}</p>}
          <input
            ref={file}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void send(f);
            }}
          />
        </section>
      )}

      {past.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-bold">Les semaines d'avant</h2>
          {past.map((w) => (
            <div key={w.weekStart} className="card flex flex-col gap-2 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{weekLabel(w.weekStart)}</p>
              <p className="font-semibold">« {w.theme} »</p>
              <div className="grid grid-cols-2 gap-3">
                {w.entries.map((e) => (
                  <Photo key={e.id} entry={e} />
                ))}
              </div>
            </div>
          ))}
          {pastMore && (
            <button type="button" onClick={more} className="chip self-center press">
              Plus ancien
            </button>
          )}
        </section>
      )}
    </div>
  );
}
