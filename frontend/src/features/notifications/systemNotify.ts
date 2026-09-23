import { ensurePushSubscription, pushActive } from "./push";

/**
 * OS-level notification banners (lock screen / notification shade). Opt-in per
 * device. When this device is registered for Web Push the server sends them
 * (even with the app closed); otherwise the open page shows them while in the
 * background. Bodies
 * never include message content — only who did what — to keep things private.
 */
export function systemNotificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator;
}

export function systemPermission(): NotificationPermission | "unsupported" {
  return systemNotificationsSupported() ? Notification.permission : "unsupported";
}

export async function enableSystemNotifications(): Promise<NotificationPermission | "unsupported"> {
  if (!systemNotificationsSupported()) return "unsupported";
  const permission = await Notification.requestPermission();
  if (permission === "granted") await ensurePushSubscription();
  return permission;
}

export async function showSystemNotification(body: string): Promise<void> {
  if (!systemNotificationsSupported() || Notification.permission !== "granted") return;
  if (document.visibilityState === "visible") return; // the in-app bell is enough
  if (pushActive()) return; // this device gets the server's push instead
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const options: NotificationOptions = { body, icon: "/icons/icon-192.png", badge: "/icons/icon-192.png" };
    if (reg) await reg.showNotification("MemoCat", options);
    else new Notification("MemoCat", options);
  } catch {
    /* best-effort */
  }
}
