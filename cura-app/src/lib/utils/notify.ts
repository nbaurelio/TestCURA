/**
 * Centralized Windows system notification utility.
 * Uses the Web Notification API to send native OS notifications.
 * Falls back silently if notifications are not supported or not permitted.
 */

export function sendSystemNotification(title: string, body: string) {
  console.log("[notify] sendSystemNotification called:", title);
  console.log("[notify] Notification supported:", typeof window !== "undefined" && "Notification" in window);
  console.log("[notify] Notification.permission:", typeof window !== "undefined" && "Notification" in window ? Notification.permission : "N/A");

  if (typeof window === "undefined" || !("Notification" in window)) {
    console.log("[notify] Notification API not available");
    return;
  }
  if (Notification.permission !== "granted") {
    console.log("[notify] Permission not granted, skipping notification");
    return;
  }

  try {
    const n = new Notification(title, { body, icon: "/favicon.ico" });
    console.log("[notify] Notification created successfully:", n);
  } catch (e) {
    console.warn("[notify] Failed to send notification:", e);
  }
}

export function requestNotificationPermission() {
  console.log("[notify] requestNotificationPermission called");
  if (typeof window === "undefined" || !("Notification" in window)) {
    console.log("[notify] Notification API not available");
    return;
  }
  console.log("[notify] Current permission:", Notification.permission);
  if (Notification.permission === "default") {
    Notification.requestPermission().then((result) => {
      console.log("[notify] Permission result:", result);
    });
  }
}
