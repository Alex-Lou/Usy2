const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

/**
 * WebSocket endpoint for STOMP. Cross-origin dev derives it from the configured
 * API URL; same-origin production (VITE_API_URL="") derives it from the page.
 * Shared by every STOMP client (chat, games, notifications).
 */
export function wsUrl(): string {
  if (API_URL) {
    return API_URL.replace(/^http/, "ws") + "/ws";
  }
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${window.location.host}/ws`;
}
