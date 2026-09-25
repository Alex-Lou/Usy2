import { useEffect, useId, useState } from "react";
import { Link } from "react-router-dom";
import { LinkPreview } from "../../components/rich/LinkPreview";
import { firstUrl, linkify } from "../../components/rich/links";
import { Icon } from "../../components/ui/Icon";
import { ProfileLink } from "../../components/ui/ProfileLink";
import { useAuth } from "../auth/useAuth";
import { Memories } from "../couple/Memories";
import { MoodChips } from "../couple/MoodChips";
import { NoteComposer } from "../couple/NoteComposer";
import { TogetherSince } from "../couple/TogetherSince";
import { ago } from "../couple/time";
import { useCouple } from "../couple/useCouple";
import { getAllProfiles } from "../profile/api";
import type { Profile } from "../profile/types";

interface Countdown {
  key: string;
  days: number;
  label?: string;
}

function daysTo(date: string): number {
  const t = new Date(date).getTime();
  if (Number.isNaN(t)) return NaN;
  return Math.ceil((t - Date.now()) / 86_400_000);
}

// Countdown widgets from both profiles, shown in the banner so they stay useful day-to-day.
function countdownsFrom(profiles: Profile[]): Countdown[] {
  const items: Countdown[] = [];
  for (const p of profiles) {
    p.widgets.forEach((w, i) => {
      if (w.type !== "countdown") return;
      const days = daysTo(w.date);
      if (!Number.isNaN(days)) items.push({ key: `${p.userId}-${i}`, days, label: w.label });
    });
  }
  return items;
}

// Folded or not is a per-device comfort choice; storage may be unavailable.
const FOLD_KEY = "memocat.coupleStrip.folded";
function readFolded(): boolean {
  try {
    return localStorage.getItem(FOLD_KEY) === "1";
  } catch {
    return false;
  }
}
function saveFolded(folded: boolean) {
  try {
    localStorage.setItem(FOLD_KEY, folded ? "1" : "0");
  } catch {
    /* not remembered, still works */
  }
}

/**
 * The "Nous" banner at the top of the feed: since when, both moods (mine is
 * one tap to change), the other person's latest note, countdowns and
 * "ce jour-là" memories. The full space lives in the profile "Nous" tab.
 * It folds down to its first line to leave room for the feed.
 */
export function CoupleStrip() {
  const { user } = useAuth();
  const myId = user?.id;
  const { couple, setCouple } = useCouple();
  const [people, setPeople] = useState<Profile[]>([]);
  const [writing, setWriting] = useState(false);
  const [folded, setFolded] = useState(readFolded);
  const bodyId = useId();

  useEffect(() => {
    getAllProfiles().then(setPeople).catch(() => {});
  }, []);

  if (!couple) return null;

  const theirNote = couple.latestNotes.find((n) => n.author.id !== myId);
  const countdowns = countdownsFrom(people);

  function toggle() {
    const next = !folded;
    setFolded(next);
    saveFolded(next);
  }

  return (
    <section className={"card flex flex-col gap-3 animate-fade-up " + (folded ? "px-4 py-2.5" : "p-4")}>
      <div className="flex items-center justify-between gap-2">
        {couple.togetherSince ? (
          <TogetherSince value={couple.togetherSince} />
        ) : (
          <span className="font-display text-lg font-bold text-text">Nous</span>
        )}
        <div className="flex shrink-0 items-center gap-1">
          {folded && theirNote && (
            <span className="mc-emoji" title={`Un mot de ${theirNote.author.displayName}`} aria-label={`Un mot de ${theirNote.author.displayName}`}>
              💌
            </span>
          )}
          {myId != null && !folded && (
            <Link to={`/profile/${myId}?tab=nous`} className="text-sm text-primary underline-offset-2 hover:underline">
              Listes, mots…
            </Link>
          )}
          <button
            type="button"
            onClick={toggle}
            aria-expanded={!folded}
            aria-controls={bodyId}
            aria-label={folded ? "Déplier" : "Replier"}
            className="grid h-9 w-9 place-items-center rounded-full text-text-muted press hover:text-text"
          >
            <Icon name="chevronDown" size={18} className={"transition-transform " + (folded ? "" : "rotate-180")} />
          </button>
        </div>
      </div>

      {!folded && (
        <div id={bodyId} className="flex flex-col gap-3">

          <MoodChips
            people={people}
            moods={couple.moods}
            myId={myId}
            onSaved={(mood) =>
              setCouple((prev) => prev && { ...prev, moods: [...prev.moods.filter((m) => m.userId !== mood.userId), mood] })
            }
          />

          {theirNote && (
            <div className="rounded-token border-l-4 border-primary bg-bg-2/60 px-3 py-2">
              <p className="whitespace-pre-wrap break-words text-text">{linkify(theirNote.text)}</p>
              {firstUrl(theirNote.text) && <LinkPreview url={firstUrl(theirNote.text)!} className="my-1.5 max-w-sm" />}
              <p className="text-[11px] text-text-muted">
                <ProfileLink userId={theirNote.author.id} className="hover:underline">
                  {theirNote.author.displayName}
                </ProfileLink>{" "}
                · {ago(theirNote.createdAt)}
              </p>
            </div>
          )}
          {writing ? (
            <NoteComposer
              autoFocus
              onSent={(note) => {
                setWriting(false);
                setCouple((prev) => prev && { ...prev, latestNotes: [...prev.latestNotes.filter((n) => n.author.id !== note.author.id), note] });
              }}
            />
          ) : (
            <button type="button" onClick={() => setWriting(true)} className="chip press self-start hover:border-primary/50">
              {theirNote ? "Répondre par un mot" : "Laisser un mot"}
            </button>
          )}

          {countdowns.length > 0 && (
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 no-scrollbar">
              {countdowns.map((c) => (
                <span key={c.key} className="chip flex shrink-0 items-center gap-1.5">
                  <Icon name="clock" size={14} className="text-primary" />
                  <span className="font-semibold text-text">{c.days >= 0 ? `J-${c.days}` : `+${-c.days}j`}</span>
                  {c.label && <span className="text-text-muted">{c.label}</span>}
                </span>
              ))}
            </div>
          )}

          <Memories compact />
        </div>
      )}
    </section>
  );
}
