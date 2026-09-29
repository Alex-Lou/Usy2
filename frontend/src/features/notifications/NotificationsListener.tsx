import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import type { Client } from "@stomp/stompjs";
import { useNotifications } from "../../app/notifications";
import { useAuth } from "../auth/useAuth";
import { emitCoupleActivity } from "../couple/activity";
import type { CoupleActivity } from "../couple/types";
import { emitLive, type LiveView } from "../live/api";
import { emitNaval, type NavalPing } from "../naval/api";
import { emitCommentReactions, emitFeedActivity, type FeedActivity, type ReactionAdded } from "../feed/activity";
import { createNotifClient, markActive, reportPresence } from "./notifClient";
import { ensurePushSubscription } from "./push";
import { showSystemNotification } from "./systemNotify";

/**
 * Invisible: opens the app-wide notification WebSocket and turns the other
 * person's activity into bell notifications. Mounted behind auth so it only
 * runs when logged in. We never notify about our own actions, nor while the
 * user is already on the matching page.
 */
export function NotificationsListener() {
  const { user } = useAuth();
  const { add } = useNotifications();
  const clientRef = useRef<Client | null>(null);
  const lastGameKeyRef = useRef<string>("");
  const lastListNotifRef = useRef<Map<number, number>>(new Map());
  const lastLiveKeyRef = useRef<string>("");
  const lastNavalKeyRef = useRef<string>("");
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
    // Bell entry + OS banner when the app is in the background.
    // `url`: where a tap on the bell entry or the banner leads.
    const notify = (text: string, url = "/") => {
      add(text, url);
      void showSystemNotification(text, url);
    };

    const onFeed = (a: FeedActivity) => {
      if (a.actorId === myId) return; // my own activity
      emitFeedActivity(a); // lets the feed show "new post" live
      const onFeedPage = window.location.pathname === "/" && document.visibilityState === "visible";
      const tagged = a.mentionedIds?.includes(myId) ?? false;
      if (a.kind === "post" && (tagged || !onFeedPage)) {
        notify(tagged ? `${a.actorName} t'a identifié·e dans un post 🏷️` : `${a.actorName} a publié un nouveau post ✨`, `/posts/${a.postId}`);
      } else if (a.kind === "comment") {
        const text =
          a.replyToId === myId ? `${a.actorName} a répondu à ton commentaire 💬`
          : tagged ? `${a.actorName} t'a identifié·e dans un commentaire 🏷️`
          : a.postAuthorId === myId ? `${a.actorName} a commenté ton post 💬`
          : `${a.actorName} a commenté un post 💬`;
        notify(text, `/posts/${a.postId}?comments=1${a.commentId ? `&comment=${a.commentId}` : ""}`);
      } else if (a.kind === "reaction" && a.postAuthorId === myId) {
        notify(`${a.actorName} a réagi ${a.emoji ?? "❤️"} à ton post`, `/posts/${a.postId}`);
      }
    };

    const LIST_QUIET_MS = 10 * 60_000; // same quiet window as the server's push
    const onCouple = (a: CoupleActivity) => {
      emitCoupleActivity(a); // open views re-fetch (also my other devices)
      if (a.actorId === myId) return;
      // The "Nous" space shows both moods and the notes; "je pense à toi" opens the chat, to answer.
      if (a.kind === "mood") {
        notify(`${a.actorName} a changé d'humeur : ${a.detail ?? ""}`, "/profile/nous");
      } else if (a.kind === "note") {
        notify(`${a.actorName} t'a laissé un mot 💌`, "/profile/nous");
      } else if (a.kind === "thinking") {
        notify(`${a.actorName} pense à toi 💭`, "/chat");
      } else if ((a.kind === "quiz-challenge" || a.kind === "quiz-done") && !window.location.pathname.startsWith("/jeux/quiz")) {
        // On the quiz page the duel list updates by itself.
        if (a.kind === "quiz-challenge") notify(`${a.actorName} te lance un défi quiz 🎯 ${a.detail ?? ""}`, "/jeux/quiz");
        else notify(`${a.actorName} a relevé ton défi quiz 🏁 Qui a gagné ?`, `/jeux/quiz?duel=${a.refId}`);
      } else if (a.kind === "nous-guess" && !window.location.pathname.startsWith("/jeux/nous")) {
        notify(`${a.actorName} a deviné une de tes réponses 💞`, "/jeux/nous?v=results&side=them");
      } else if (a.kind === "nous-reset-ask" && !window.location.pathname.startsWith("/jeux/nous")) {
        notify(`${a.actorName} propose de repartir de zéro dans 💞 Nous deux${a.detail ? ` (${a.detail})` : ""} : d'accord ?`, "/jeux/nous");
      } else if (a.kind === "nous-reset" && (a.detail === "accepted" || a.detail === "refused") && !window.location.pathname.startsWith("/jeux/nous")) {
        notify(a.detail === "accepted" ? `${a.actorName} a dit oui : on repart de zéro dans 💞 Nous deux ✨` : `${a.actorName} préfère garder vos réponses de 💞 Nous deux`, "/jeux/nous");
      } else if (a.kind === "list" && a.refId != null) {
        const last = lastListNotifRef.current.get(a.refId) ?? 0;
        lastListNotifRef.current.set(a.refId, Date.now());
        if (Date.now() - last >= LIST_QUIET_MS) {
          notify(`${a.actorName} a mis à jour la liste « ${a.detail ?? ""} »`, `/profile/nous?list=${a.refId}`);
        }
      }
    };

    // Only the owner of the message/comment hears about it; the link opens that very one.
    const onReaction = (r: ReactionAdded) => {
      if (r.ownerId !== myId || r.actorId === myId) return;
      if (r.target === "message") {
        if (window.location.pathname.startsWith("/chat") && document.visibilityState === "visible") return; // sees it live
        notify(`${r.actorName} a réagi ${r.emoji} à ton message`, `/chat?m=${r.refId}`);
      } else if (r.postId != null) {
        notify(`${r.actorName} a réagi ${r.emoji} à ton commentaire`, `/posts/${r.postId}?comments=1&comment=${r.refId}`);
      }
    };

    // ⚡ Live game: the open page follows; elsewhere, an invitation or a pause waiting on me rings.
    const onLive = (g: LiveView) => {
      emitLive(g);
      if (g.hostId !== myId && g.guestId !== myId) return;
      if (window.location.pathname.startsWith("/jeux/direct")) return; // watching it live
      const other = g.hostId === myId ? g.guestName : g.hostName;
      const key = `${g.id}:${g.status}:${g.index}`;
      if (key === lastLiveKeyRef.current) return; // duplicate broadcast
      lastLiveKeyRef.current = key;
      if (g.status === "invited" && g.guestId === myId) notify(`${other} te propose une partie en direct ⚡ ${g.label}`, "/jeux/direct");
      else if (g.status === "paused" && g.waiting.includes(myId)) notify(`${other} t'attend : la partie en direct est en pause ⏸`, "/jeux/direct");
    };

    // 🚢 Battleship: the open page re-fetches; elsewhere, a new battle, my turn or a defeat rings.
    const onNaval = (p: NavalPing) => {
      emitNaval(p);
      if (p.hostId !== myId && p.guestId !== myId) return;
      if (window.location.pathname.startsWith("/jeux/bataille")) return; // watching it
      const other = p.hostId === myId ? p.guestName : p.hostName;
      const key = p.status === "placing" ? `${p.id}:placing` : `${p.id}:${p.status}:${p.shots}`;
      if (key === lastNavalKeyRef.current) return; // duplicate broadcast
      lastNavalKeyRef.current = key;
      if (p.status === "placing" && p.guestId === myId) notify(`${other} lance une bataille navale 🚢 Place ta flotte !`, "/jeux/bataille");
      else if (p.status === "playing" && p.turnId === myId) notify(p.shots === 0 ? "Les deux flottes sont prêtes : à toi de tirer ⚓" : `${other} a tiré${p.hit ? " et touché 💥" : " dans l'eau 💦"} — à toi ⚓`, "/jeux/bataille");
      else if (p.status === "done" && p.winnerId != null && p.winnerId !== myId) notify(`${other} a coulé toute ta flotte 🏳️ Revanche ?`, "/jeux/bataille");
    };

    const client = createNotifClient(
      (m) => {
        if (m.sender.id === myId) return; // my own message
        if (window.location.pathname.startsWith("/chat") && document.visibilityState === "visible") return; // already reading
        notify(`${m.sender.displayName} t'a envoyé un message 💬`, `/chat?m=${m.id}`);
      },
      (state) => {
        const g = state.game;
        if (!g) return;
        const filled = g.board.filter((c) => c != null).length;
        const key = `${g.id}:${filled}:${g.status}`;
        if (key === lastGameKeyRef.current) return; // duplicate broadcast
        lastGameKeyRef.current = key;

        const onMorpion = window.location.pathname.startsWith("/jeux/morpion");
        if (onMorpion) return; // watching the board live

        if (g.status === "finished" && !g.draw && g.winnerUserId != null && g.winnerUserId !== myId) {
          const winner = state.scores.find((s) => s.userId === g.winnerUserId)?.displayName ?? "Ton binôme";
          notify(`${winner} a gagné au Morpion 🏆`, "/jeux/morpion");
        } else if (g.status === "active" && g.turnUserId === myId && filled > 0) {
          notify("À toi de jouer au Morpion 🎮", "/jeux/morpion");
        }
      },
      onFeed,
      onCouple,
      emitCommentReactions, // open comment lists update live
      onReaction,
      onLive,
      onNaval,
    );
    clientRef.current = client;
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
  }, [myId, add]);

  return null;
}
