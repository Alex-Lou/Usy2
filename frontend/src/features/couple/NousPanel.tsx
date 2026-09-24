import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAllProfiles } from "../profile/api";
import type { Profile } from "../profile/types";
import { DateList } from "./DateList";
import { today, upcoming } from "./dates";
import { ListsPanel } from "./ListsPanel";
import { Memories } from "./Memories";
import { MoodChips } from "./MoodChips";
import { NotesPanel } from "./NotesPanel";
import { TogetherSince } from "./TogetherSince";
import { useCouple } from "./useCouple";
import { useDates } from "./useDates";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card flex flex-col gap-3 p-4 animate-fade-up">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-text-muted">{title}</h2>
      {children}
    </section>
  );
}

/** The full shared space (profile "Nous" tab): same data on both profiles. */
export function NousPanel({ myId }: { myId: number | undefined }) {
  const { couple, setCouple } = useCouple();
  const [people, setPeople] = useState<Profile[]>([]);

  useEffect(() => {
    getAllProfiles().then(setPeople).catch(() => {});
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <Section title="Nous">
        <TogetherSince value={couple?.togetherSince ?? null} editable onSaved={setCouple} />
        <MoodChips
          people={people}
          moods={couple?.moods ?? []}
          myId={myId}
          onSaved={(mood) =>
            setCouple((prev) => prev && { ...prev, moods: [...prev.moods.filter((m) => m.userId !== mood.userId), mood] })
          }
        />
        <Memories />
      </Section>
      <Section title="Nos dates">
        <NextDates />
      </Section>
      <Section title="Petits mots">
        <NotesPanel myId={myId} />
      </Section>
      <Section title="Listes">
        <ListsPanel />
      </Section>
    </div>
  );
}

/** The next few shared dates, and the way to the calendar. */
function NextDates() {
  const { events, countdowns } = useDates();
  const next = upcoming(events ?? [], countdowns, today(), 3);
  return (
    <>
      {events === null ? (
        <div className="h-12 animate-pulse rounded-token bg-border/50" />
      ) : next.length ? (
        <DateList entries={next} compact />
      ) : (
        <p className="text-sm text-text-muted">Aucune date à venir.</p>
      )}
      <Link to="/dates" className="chip press self-start text-sm hover:border-primary/50">Ouvrir le calendrier</Link>
    </>
  );
}
