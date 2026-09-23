import { useEffect, useState } from "react";
import { getAllProfiles } from "../profile/api";
import type { Profile } from "../profile/types";
import { ListsPanel } from "./ListsPanel";
import { Memories } from "./Memories";
import { MoodChips } from "./MoodChips";
import { NotesPanel } from "./NotesPanel";
import { TogetherSince } from "./TogetherSince";
import { useCouple } from "./useCouple";

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
      <Section title="Petits mots">
        <NotesPanel myId={myId} />
      </Section>
      <Section title="Listes">
        <ListsPanel />
      </Section>
    </div>
  );
}
