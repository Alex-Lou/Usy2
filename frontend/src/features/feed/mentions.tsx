import { useEffect, useState, type ReactNode } from "react";
import { linkify } from "../../components/rich/links";
import { ProfileLink } from "../../components/ui/ProfileLink";
import { getAllProfiles } from "../profile/api";

/** 🏷️ Someone who can be tagged: "@" + their name, as the server reads it (Mentions.java). */
export interface Person {
  id: number;
  name: string;
}

let everyone: Promise<Person[]> | null = null;

/** Both of us (fetched once for the whole app). */
export function usePeople(): Person[] {
  const [people, setPeople] = useState<Person[]>([]);
  useEffect(() => {
    everyone ??= getAllProfiles()
      .then((ps) => ps.map((p) => ({ id: p.userId, name: p.displayName })))
      .catch(() => {
        everyone = null;
        return [];
      });
    let alive = true;
    void everyone.then((p) => alive && setPeople(p));
    return () => {
      alive = false;
    };
  }, []);
  return people;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The text with each "@Name" of someone we know as a link to their profile (and web links clickable). */
export function withMentions(text: string, people: Person[]): ReactNode[] {
  if (!people.length || !text.includes("@")) return linkify(text);
  const byName = new Map(people.map((p) => [p.name.toLowerCase(), p]));
  const names = [...people].sort((a, b) => b.name.length - a.name.length).map((p) => escape(p.name));
  const tag = new RegExp(`@(${names.join("|")})(?![\\p{L}\\p{N}])`, "giu");
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(tag)) {
    const person = byName.get(m[1].toLowerCase());
    if (!person) continue;
    if (m.index > last) out.push(...linkify(text.slice(last, m.index)));
    out.push(
      <ProfileLink key={`m${m.index}`} userId={person.id} className="rounded font-semibold text-primary hover:underline">
        @{person.name}
      </ProfileLink>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(...linkify(text.slice(last)));
  return out;
}

/** The "@…" being typed just before the caret, if any: where it starts and what follows the "@". */
export function mentionAt(text: string, caret: number): { start: number; query: string } | null {
  const at = text.lastIndexOf("@", caret - 1);
  if (at < 0 || (at > 0 && !/\s/.test(text[at - 1]))) return null;
  const query = text.slice(at + 1, caret);
  return query.length <= 30 && !query.includes("\n") ? { start: at, query } : null;
}

/**
 * The names to offer while "@…" is typed (everyone but me whose name starts
 * with it); picking one writes "@Name " in the text.
 */
export function MentionSuggest({ text, caret, people, myId, onPick }: {
  text: string;
  caret: number;
  people: Person[];
  myId?: number;
  onPick: (next: string, caret: number) => void;
}) {
  const at = mentionAt(text, caret);
  if (!at) return null;
  const q = at.query.toLowerCase();
  const matches = people.filter((p) => p.id !== myId && p.name.toLowerCase().startsWith(q) && p.name.toLowerCase() !== q);
  if (!matches.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5" role="listbox" aria-label="Taguer quelqu'un">
      {matches.map((p) => (
        <button
          key={p.id}
          type="button"
          role="option"
          aria-selected="false"
          // Keeps the focus (and the keyboard) in the text box.
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            const inserted = `@${p.name} `;
            onPick(text.slice(0, at.start) + inserted + text.slice(caret), at.start + inserted.length);
          }}
          className="chip press text-sm"
        >
          🏷️ @{p.name}
        </button>
      ))}
    </div>
  );
}
