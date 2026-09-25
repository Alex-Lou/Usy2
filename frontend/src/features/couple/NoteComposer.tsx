import { useState } from "react";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { Input } from "../../components/ui/Input";
import { addNote } from "./api";
import type { Note } from "./types";

const MAX = 280;

/** One-line composer for a short note to the other person. */
export function NoteComposer({ onSent, autoFocus }: { onSent: (note: Note) => void; autoFocus?: boolean }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const value = text.trim();
    if (!value || sending) return;
    setSending(true);
    setError(null);
    try {
      onSent(await addNote(value));
      setText("");
    } catch {
      setError("Le mot n'a pas pu être envoyé.");
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={send} className="flex flex-col gap-1">
      <div className="flex gap-2">
        <Input
          value={text}
          maxLength={MAX}
          autoFocus={autoFocus}
          placeholder="Laisser un mot…"
          onChange={(e) => setText(e.target.value)}
        />
        <Button type="submit" disabled={!text.trim() || sending} className="!px-3" aria-label="Envoyer le mot">
          <Icon name="send" size={16} />
        </Button>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </form>
  );
}
