import { useEffect, useState } from "react";

const CHECK_EVERY_MS = 10 * 60_000;

/** The app's main script, as the page loaded it: its name changes with every deployment. */
function currentScript(): string | null {
  return document.querySelector<HTMLScriptElement>('script[type="module"][src*="/assets/"]')?.getAttribute("src") ?? null;
}

async function latestScript(): Promise<string | null> {
  const html = await fetch("/", { cache: "no-store" }).then((r) => (r.ok ? r.text() : ""));
  return html.match(/<script[^>]+type="module"[^>]+src="([^"]*\/assets\/[^"]+)"/)?.[1] ?? null;
}

/**
 * After a deployment, a phone that kept the app open still runs the old one:
 * « Nouvelle version » appears, one tap reloads. Checked on return to the app
 * and every few minutes (production only).
 */
export function UpdateBanner() {
  const [fresh, setFresh] = useState(false);

  useEffect(() => {
    const mine = currentScript();
    if (!import.meta.env.PROD || !mine) return;
    const check = () => {
      if (document.visibilityState !== "visible") return;
      latestScript()
        .then((latest) => latest && latest !== mine && setFresh(true))
        .catch(() => {
          /* offline: try again later */
        });
    };
    const timer = window.setInterval(check, CHECK_EVERY_MS);
    document.addEventListener("visibilitychange", check);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);

  if (!fresh) return null;
  return (
    <div className="fixed inset-x-0 bottom-[calc(var(--tabbar-h)+0.75rem)] z-[55] flex justify-center px-4 lg:bottom-4" role="status">
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="flex items-center gap-2 rounded-full btn-brand px-4 py-2.5 text-sm font-semibold shadow-glow animate-pop press"
      >
        ✨ Nouvelle version de MemoCat · Actualiser
      </button>
    </div>
  );
}
