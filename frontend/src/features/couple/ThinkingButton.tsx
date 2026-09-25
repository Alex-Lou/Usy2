import { useEffect, useState } from "react";
import { ApiError } from "../../lib/api/client";
import { thinkOfYou } from "./api";

const QUIET_MS = 60_000; // same minute as the server's limit

/**
 * « 💭 Je pense à toi »: one tap sends the other person a gentle notification,
 * and a small heart flies off the button. Then it rests for a minute.
 */
export function ThinkingButton() {
  const [sentAt, setSentAt] = useState(0);
  const [hearts, setHearts] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const resting = sentAt > 0;

  useEffect(() => {
    if (!resting) return;
    const t = window.setTimeout(() => setSentAt(0), QUIET_MS - (Date.now() - sentAt));
    return () => window.clearTimeout(t);
  }, [resting, sentAt]);

  async function send() {
    setError(null);
    try {
      await thinkOfYou();
      const at = Date.now();
      setSentAt(at);
      setHearts((h) => [...h, at]);
      window.setTimeout(() => setHearts((h) => h.filter((x) => x !== at)), 1200);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Pas envoyé, réessaie.");
    }
  }

  return (
    <span className="relative inline-flex flex-col items-start">
      <button
        type="button"
        onClick={send}
        disabled={resting}
        data-thinking=""
        className={"chip press relative flex items-center gap-1.5 text-sm " + (resting ? "text-text-muted" : "hover:border-primary/50")}
      >
        <span className="mc-emoji" aria-hidden="true">💭</span> {resting ? "Envoyé" : "Je pense à toi"}
        {hearts.map((h) => (
          <span key={h} aria-hidden="true" data-heart-fly="" className="mc-emoji animate-heart-fly pointer-events-none absolute -top-1 right-2">
            ❤️
          </span>
        ))}
      </button>
      {error && <span role="alert" className="mt-1 text-xs text-danger">{error}</span>}
    </span>
  );
}
