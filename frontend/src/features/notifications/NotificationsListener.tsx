import { emitCrossword } from "../crossword/api";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../../app/notifications";
import { useAuth } from "../auth/useAuth";
import { emitCoupleActivity } from "../couple/activity";
import { emitCommentReactions, emitFeedActivity } from "../feed/activity";
import { emitLive } from "../live/api";
import { emitNaval } from "../naval/api";
import { emitPetitBac } from "../petitbac/api";
import { feel } from "../../lib/feel";
import type { NotificationEntry } from "./api";
import { emitToast } from "./liveToast";
import { refreshUnread } from "../chat/unread";
import { createNotifClient, markActive, reportPresence } from "./notifClient";
import { ensurePushSubscription } from "./push";
import { showSystemNotification } from "./systemNotify";

/**
 * Already seen: the page it points to is the one on screen (a message while
 * reading the chat), or it is a new post while on the feed (shown there live).
 */
function alreadyThere(n: NotificationEntry): boolean {
  if (document.visibilityState !== "visible") return false;
  const here = window.location.pathname;
  return new URL(n.url, window.location.origin).pathname === here || (here === "/" && /^post-\d+$/.test(n.tag));
}

/**
 * Invisible: opens the app-wide WebSocket. New bell entries come from the
 * server (the same texts as the push notifications, see PushNotifier); the
 * shared activity is passed on to the open pages. Mounted behind auth.
 */
export function NotificationsListener() {
  const { user } = useAuth();
  const { reload, markRead } = useNotifications();
  const navigate = useNavigate();
  const myId = user?.id ?? -1;

  // Web Push: re-sync this device's subscription, and open the right page when
  // a notification is tapped while the app is already open (see sw.js).
  useEffect(() => {
    void ensurePushSubscription();
    if (!("serviceWorker" in navigator)) return;
    const onSwMessage = (e: MessageEvent<{ type?: string; url?: string } | null>) => {
      const url = e.data?.url;
      if (e.data?.type === "memocat:navigate" && url && /^\/(?!\/)/.test(url)) navigate(url); // in-app paths only
    };
    navigator.serviceWorker.addEventListener("message", onSwMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onSwMessage);
  }, [navigate]);

  useEffect(() => {
    const onNotification = (n: NotificationEntry) => {
      if (n.tag === "chat") refreshUnread(); // the red bubble on the Messages tab
      if (alreadyThere(n)) {
        void markRead(n.id); // seen on the page itself
        return;
      }
      void reload();
      if (document.visibilityState === "visible") {
        if (n.tag === "thinking") return; // LoveBurst already shows it, with its own sound
        emitToast(n); // banner at the top, live
        feel.notify();
        return;
      }
      // OS banner on a device without Web Push, while the app sits in the background.
      void showSystemNotification(n.excerpt ? `${n.text}\n${n.excerpt}` : n.text, n.url);
    };

    const client = createNotifClient({
      onNotification,
      onFeed: (a) => a.actorId !== myId && emitFeedActivity(a), // lets the feed show "new post" live
      onCouple: emitCoupleActivity, // open views re-fetch (also my other devices)
      onCommentReactions: emitCommentReactions, // open comment lists update live
      onLive: emitLive,
      onNaval: emitNaval,
      onCrossword: emitCrossword,
      onPetitBac: emitPetitBac,
    });
    const onVisibility = () => {
      if (document.visibilityState === "visible") markActive();
      reportPresence(client);
    };
    const onActivity = () => {
      markActive();
      reportPresence(client, true); // back from idle
    };
    const ACTIVITY = ["pointerdown", "keydown", "wheel", "touchstart"] as const;
    document.addEventListener("visibilitychange", onVisibility);
    for (const type of ACTIVITY) window.addEventListener(type, onActivity, { passive: true });
    const idleCheck = window.setInterval(() => reportPresence(client, true), 30_000); // gone idle
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      for (const type of ACTIVITY) window.removeEventListener(type, onActivity);
      window.clearInterval(idleCheck);
      void client.deactivate();
    };
  }, [myId, reload, markRead]);

  return null;
}
