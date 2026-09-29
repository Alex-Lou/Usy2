import { useEffect, useState } from "react";
import { onCoupleActivity } from "../../features/couple/activity";
import { useAuth } from "../../features/auth/useAuth";
import { feel } from "../../lib/feel";

/**
 * « 💭 Je pense à toi » received while the app is open: hearts float up over
 * the page for a moment, with a soft chime and a buzz (see feel.ts). Taps go
 * through; it only decorates.
 */
export function LoveBurst() {
  const { user } = useAuth();
  const [from, setFrom] = useState<{ name: string; key: number } | null>(null);

  useEffect(
    () =>
      onCoupleActivity((a) => {
        if (a.kind !== "thinking" || a.actorId === user?.id) return;
        feel.love();
        setFrom({ name: a.actorName, key: Date.now() });
      }),
    [user?.id],
  );

  useEffect(() => {
    if (!from) return;
    const t = window.setTimeout(() => setFrom(null), 2600);
    return () => window.clearTimeout(t);
  }, [from]);

  if (!from) return null;
  return (
    <div key={from.key} className="pointer-events-none fixed inset-0 z-[80] overflow-hidden" aria-live="polite">
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <span key={i} className="mc-love-heart mc-emoji" style={{ left: `${12 + i * 12}%`, animationDelay: `${(i % 3) * 0.18}s` }} aria-hidden="true">
          {i % 2 ? "💞" : "❤️"}
        </span>
      ))}
      <div className="mc-love-text absolute inset-x-0 top-1/3 flex justify-center px-4">
        <p className="rounded-full border border-border bg-surface px-5 py-2.5 font-display text-xl font-bold text-primary shadow-card">
          {from.name} pense à toi 💭
        </p>
      </div>
    </div>
  );
}
