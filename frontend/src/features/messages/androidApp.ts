/**
 * The « Messages » Android app (android/messages): where to get it, and
 * whether to offer it. The latest signed APK is published by the
 * android-messages workflow under a fixed name.
 */
export const MESSAGES_APK_URL = "https://github.com/Alex-Lou/Usy2/releases/latest/download/Messages.apk";

const IN_APP_KEY = "memocat.inMessagesApp";
const APP_REFERRER = "android-app://com.memocat.messages";

/** Opened by the app itself (its first page says so; remembered for this visit). */
function insideTheApp(): boolean {
  const launched = typeof document !== "undefined" && document.referrer.startsWith(APP_REFERRER);
  try {
    if (launched) sessionStorage.setItem(IN_APP_KEY, "1");
    return launched || sessionStorage.getItem(IN_APP_KEY) === "1";
  } catch {
    return launched;
  }
}

/** On an Android phone, outside the app: worth a « Installer l'app Messages ». */
export const offerAndroidApp = typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent) && !insideTheApp();
