import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import type { Client } from "@stomp/stompjs";
import { useNotifications } from "../../app/notifications";
import { useAuth } from "../auth/useAuth";
import { emitCoupleActivity } from "../couple/activity";
import type { CoupleActivity } from "../couple/types";
import { emitCommentReactions, emitFeedActivity, type FeedActivity, type ReactionAdded } from "../feed/activity";
import { createNotifClient, reportPresence } from "./notifClient";
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
      if (a.kind === "post" && !onFeedPage) {
        notify(`${a.actorName} a publié un nouveau post ✨`, `/posts/${a.postId}`);
      } else if (a.kind === "comment") {
        notify(a.postAuthorId === myId ? `${a.actorName} a commenté ton post 💬` : `${a.actorName} a commenté un post 💬`, `/posts/${a.postId}?comments=1`);
      } else if (a.kind === "reaction" && a.postAuthorId === myId) {
        notify(`${a.actorName} a réagi ${a.emoji ?? "❤️"} à ton post`, `/posts/${a.postId}`);
      }
    };

    const LIST_QUIET_MS = 10 * 60_000; // same quiet window as the server's push
    const onCouple = (a: CoupleActivity) => {
      emitCoupleActivity(a); // open views re-fetch (also my other devices)
      if (a.actorId === myId) return;
      if (a.kind === "mood") {
        notify(`${a.actorName} a changé d'humeur : ${a.detail ?? ""}`);
      } else if (a.kind === "note") {
        notify(`${a.actorName} t'a laissé un mot`);
      } else if (a.kind === "thinking") {
        notify(`${a.actorName} pense à toi 💭`);
      } else if ((a.kind === "quiz-challenge" || a.kind === "quiz-done") && !window.location.pathname.startsWith("/jeux/quiz")) {
        // On the quiz page the duel list updates by itself.
        if (a.kind === "quiz-challenge") notify(`${a.actorName} te lance un défi quiz 🎯 ${a.detail ?? ""}`, "/jeux/quiz");
        else notify(`${a.actorName} a relevé ton défi quiz 🏁 Qui a gagné ?`, `/jeux/quiz?duel=${a.refId}`);
      } else if ((a.kind === "nous-guess" || a.kind === "nous-judged") && !window.location.pathname.startsWith("/jeux/nous")) {
        if (a.kind === "nous-guess") notify(`${a.actorName} a deviné une de tes réponses : à toi de juger ⚖️`, "/jeux/nous?tab=judge");
        else notify(`${a.actorName} a jugé ta devinette : ${a.detail === "right" ? "juste ! 🎯" : a.detail === "close" ? "presque ! 😏" : "raté 🙈"}`, "/jeux/nous?tab=history");
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

    const client = createNotifClient(
      (m) => {
        if (m.sender.id === myId) return; // my own message
        if (window.location.pathname.startsWith("/chat") && document.visibilityState === "visible") return; // already reading
        notify(`${m.sender.displayName} t'a envoyé un message 💬`, "/chat");
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
    );
    clientRef.current = client;
    const onVisibility = () => reportPresence(client);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      void client.deactivate();
    };
  }, [myId, add]);

  return null;
}
