import { useEffect, useState } from "react";
import { ensurePushSubscription, pushSupported } from "../notifications/push";
import { enableSystemNotifications } from "../notifications/systemNotify";

type State = "checking" | "on" | "ask" | "blocked" | "failed";

/**
 * A line under the header, only when this phone would not ring for a new
 * message: notifications never allowed (or reset, e.g. after a reinstall),
 * blocked in Android's settings, or the registration with the server failed.
 */
export function NotifPrompt() {
  const [state, setState] = useState<State>("checking");

  async function check() {
    if (!pushSupported()) return setState("on"); // nothing to offer here
    if (Notification.permission === "denied") return setState("blocked");
    if (Notification.permission === "default") return setState("ask");
    setState((await ensurePushSubscription()) ? "on" : "failed");
  }

  useEffect(() => {
    void check();
  }, []);

  async function enable() {
    setState("checking");
    const permission = await enableSystemNotifications();
    if (permission === "denied") return setState("blocked");
    await check();
  }

  if (state === "checking" || state === "on") return null;
  return (
    <div role="status" className="msg-sheet mx-auto mt-2 flex w-[calc(100%-1.5rem)] max-w-3xl items-center gap-3 rounded-2xl px-4 py-2.5 text-[13px]">
      <span className="min-w-0 flex-1">
        {state === "blocked"
          ? "Notifications bloquées : autorise-les dans Réglages › Applis › Messages › Notifications."
          : state === "failed"
            ? "Ce téléphone n'a pas pu s'inscrire aux notifications."
            : "Les notifications sont coupées sur ce téléphone."}
      </span>
      {state !== "blocked" && (
        <button type="button" onClick={() => void enable()} className="msg-cta shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-semibold press">
          {state === "failed" ? "Réessayer" : "Activer"}
        </button>
      )}
    </div>
  );
}
