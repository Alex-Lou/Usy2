import { apiRequest } from "../../lib/api/client";

/**
 * Web Push: lets the server reach this device even when MemoCat is closed.
 * The browser's push service only ever sees encrypted payloads; the server
 * signs requests with its own VAPID key (fetched here, never configured).
 */
export function pushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

/** On iPhone/iPad, notifications only exist once MemoCat is added to the home screen. */
export function needsHomeScreenInstall(): boolean {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return ios && !window.matchMedia("(display-mode: standalone)").matches;
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const base64 = (value + "=".repeat((4 - (value.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

function sameKey(a: ArrayBuffer | null, b: Uint8Array<ArrayBuffer>): boolean {
  if (!a || a.byteLength !== b.length) return false;
  const bytes = new Uint8Array(a);
  return bytes.every((v, i) => v === b[i]);
}

let active = false;

/** True once this device is registered with the server (so it gets pushes). */
export function pushActive(): boolean {
  return active;
}

/**
 * Keeps the server in sync with this device's subscription (idempotent). Called
 * after the permission prompt and on every app start. Best-effort, never throws.
 */
export async function ensurePushSubscription(): Promise<void> {
  if (!pushSupported() || Notification.permission !== "granted") return;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return; // no service worker (dev build)
    const { publicKey } = await apiRequest<{ publicKey: string }>("/api/push/public-key");
    const serverKey = base64UrlToBytes(publicKey);

    let sub = await reg.pushManager.getSubscription();
    if (sub && !sameKey(sub.options.applicationServerKey, serverKey)) {
      await sub.unsubscribe(); // server identity changed: the old subscription can't be used
      sub = null;
    }
    sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: serverKey });
    await apiRequest("/api/push/subscriptions", { method: "POST", body: sub.toJSON() });
    active = true;
  } catch {
    /* retried on next app start */
  }
}

/**
 * On logout: this device stops receiving the account's notifications. The
 * server drops the stale subscription on its next push (the service answers 410).
 */
export async function unsubscribeThisDevice(): Promise<void> {
  active = false;
  if (!pushSupported()) return;
  try {
    const sub = await (await navigator.serviceWorker.getRegistration())?.pushManager.getSubscription();
    await sub?.unsubscribe();
  } catch {
    /* best-effort */
  }
}
