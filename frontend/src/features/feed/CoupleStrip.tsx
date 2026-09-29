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
import { ThinkingButton } from "../couple/ThinkingButton";
import { TogetherSince } from "../couple/TogetherSince";
import { ago, daysSince } from "../couple/time";
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
// Folded by default, so the feed shows first ("v2": the choice kept from before the
// default changed would otherwise keep it open).
const FOLD_KEY = "memocat.coupleStrip.folded.v2";
function readFolded(): boolean {
  try {
    return localStorage.getItem(FOLD_KEY) !== "0";
  } catch {
    return true;
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
 * one tap to change), the latest note of each of us (newest first), countdowns and
 * "ce jour-là" memories. The full space lives in the profile "Nous" tab.
 * It folds down to its first line to leave room for the feed.
 */
export function CoupleStrip() {
  const { user } = useAuth();
  const myId = user?.id;
  const { couple, loading, setCouple } = useCouple();
  const [people, setPeople] = useState<Profile[]>([]);
  const [writing, setWriting] = useState(false);
  const [folded, setFolded] = useState(readFolded);
  const bodyId = useId();

  useEffect(() => {
    getAllProfiles().then(setPeople).catch(() => {});
  }, []);

  if (!couple) {
    // Keeps the banner's room while it loads, so the feed below does not jump.
    return loading ? <div className={"card shrink-0 animate-pulse " + (folded ? "h-14" : "h-72")} aria-hidden="true" /> : null;
  }

  const theirNote = couple.latestNotes.find((n) => n.author.id !== myId);
  const notes = [...couple.latestNotes].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const countdowns = countdownsFrom(people);

  function toggle() {
    const next = !folded;
    setFolded(next);
    saveFolded(next);
  }

  return (
    <section className={"card flex flex-col gap-3 animate-fade-up " + (folded ? "px-4 py-2.5" : "p-4")}>
      <div className="flex items-center justify-between gap-2">
        {couple.togetherSince && folded ? (
          // Folded: one short line.
          <span className="min-w-0 truncate font-display font-bold text-text">💞 {daysSince(couple.togetherSince).toLocaleString("fr-FR")} jours</span>
        ) : couple.togetherSince ? (
          <TogetherSince value={couple.togetherSince} />
        ) : (
          <span className="font-display text-lg font-bold text-text">Nous</span>
        )}
        <div className="flex shrink-0 items-center gap-1">
          {folded &&
            couple.moods.map((m) => {
              const name = people.find((p) => p.userId === m.userId)?.displayName ?? "";
              const text = `${name} : ${m.emoji}${m.label ? ` ${m.label}` : ""}`;
              return (
                <span key={m.userId} className="mc-emoji text-lg leading-none" title={text} aria-label={text}>
                  {m.emoji}
                </span>
              );
            })}
          {folded && theirNote && (
            <span className="mc-emoji" title={`Un mot de ${theirNote.author.displayName}`} aria-label={`Un mot de ${theirNote.author.displayName}`}>
              💌
            </span>
          )}
          {myId != null && !folded && (
            <Link to="/profile/nous" className="text-sm text-primary underline-offset-2 hover:underline">
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

          {notes.map((note) => (
            <div key={note.id} className="rounded-token border-l-4 border-primary bg-bg-2/60 px-3 py-2">
              <p className="whitespace-pre-wrap break-words text-text">{linkify(note.text)}</p>
              {firstUrl(note.text) && <LinkPreview url={firstUrl(note.text)!} className="my-1.5 max-w-sm" />}
              <p className="text-[11px] text-text-muted">
                <ProfileLink userId={note.author.id} className="hover:underline">
                  {note.author.displayName}
                </ProfileLink>{" "}
                · {ago(note.createdAt)}
              </p>
            </div>
          ))}
          {writing ? (
            <NoteComposer
              autoFocus
              onSent={(note) => {
                setWriting(false);
                setCouple((prev) => prev && { ...prev, latestNotes: [...prev.latestNotes.filter((n) => n.author.id !== note.author.id), note] });
              }}
            />
          ) : (
            <div className="flex flex-wrap items-start gap-2">
              <button type="button" onClick={() => setWriting(true)} className="chip press hover:border-primary/50">
                {theirNote ? "Répondre par un mot" : "Laisser un mot"}
              </button>
              <ThinkingButton />
            </div>
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
