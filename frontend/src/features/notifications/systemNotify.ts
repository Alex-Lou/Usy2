/**
 * OS-level notification banners (lock screen / notification shade) for when the
 * app is open but in the background. Opt-in per device. Bodies never include
 * message content — only who did what — to keep things private on a lock screen.
 */
export function systemNotificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator;
}

export function systemPermission(): NotificationPermission | "unsupported" {
  return systemNotificationsSupported() ? Notification.permission : "unsupported";
}

export async function enableSystemNotifications(): Promise<NotificationPermission | "unsupported"> {
  if (!systemNotificationsSupported()) return "unsupported";
  return Notification.requestPermission();
}

export async function showSystemNotification(body: string): Promise<void> {
  if (!systemNotificationsSupported() || Notification.permission !== "granted") return;
  if (document.visibilityState === "visible") return; // the in-app bell is enough
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const options: NotificationOptions = { body, icon: "/icons/icon-192.png", badge: "/icons/icon-192.png" };
    if (reg) await reg.showNotification("MemoCat", options);
    else new Notification("MemoCat", options);
  } catch {
    /* best-effort */
  }
}
