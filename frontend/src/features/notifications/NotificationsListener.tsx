import { useEffect, useRef } from "react";
import type { Client } from "@stomp/stompjs";
import { useNotifications } from "../../app/notifications";
import { useAuth } from "../auth/useAuth";
import { createNotifClient } from "./notifClient";

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

  const myId = user?.id ?? -1;

  useEffect(() => {
    const client = createNotifClient(
      (m) => {
        if (m.sender.id === myId) return; // my own message
        if (window.location.pathname.startsWith("/chat")) return; // already reading
        add(`${m.sender.displayName} t'a envoyé un message 💬`);
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
          add(`${winner} a gagné au Morpion 🏆`);
        } else if (g.status === "active" && g.turnUserId === myId && filled > 0) {
          add("À toi de jouer au Morpion 🎮");
        }
      },
    );
    clientRef.current = client;
    return () => {
      void client.deactivate();
    };
  }, [myId, add]);

  return null;
}
