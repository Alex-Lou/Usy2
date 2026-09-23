import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../../components/ui/Icon";
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

/**
 * The "Nous" banner at the top of the feed: since when, both moods (mine is
 * one tap to change), the other person's latest note, countdowns and
 * "ce jour-là" memories. The full space lives in the profile "Nous" tab.
 */
export function CoupleStrip() {
  const { user } = useAuth();
  const myId = user?.id;
  const { couple, setCouple } = useCouple();
  const [people, setPeople] = useState<Profile[]>([]);
  const [writing, setWriting] = useState(false);

  useEffect(() => {
    getAllProfiles().then(setPeople).catch(() => {});
  }, []);

  if (!couple) return null;

  const theirNote = couple.latestNotes.find((n) => n.author.id !== myId);
  const countdowns = countdownsFrom(people);

  return (
    <section className="card flex flex-col gap-3 p-4 animate-fade-up">
      <div className="flex items-center justify-between gap-2">
        {couple.togetherSince ? (
          <TogetherSince value={couple.togetherSince} />
        ) : (
          <span className="font-display text-lg font-bold text-text">Nous</span>
        )}
        {myId != null && (
          <Link to={`/profile/${myId}?tab=nous`} className="shrink-0 text-sm text-primary underline-offset-2 hover:underline">
            Listes, mots…
          </Link>
        )}
      </div>

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
          <p className="whitespace-pre-wrap break-words text-text">{theirNote.text}</p>
          <p className="text-[11px] text-text-muted">
            {theirNote.author.displayName} · {ago(theirNote.createdAt)}
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
    </section>
  );
}
