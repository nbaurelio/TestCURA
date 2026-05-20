/**
 * Centralized Windows system notification utility.
 * Uses the Web Notification API to send native OS notifications.
 * Chrome/Edge require showNotification() via a ServiceWorker registration.
 * Falls back to direct new Notification() for Firefox.
 * Respects Do Not Disturb (DND) setting from notifications module.
 * Also tracks notification in app state for Referral/Calendar panels.
 */

import { getDNDState } from "@/lib/api/notifications";

// Store reference to the context add function (set by NotificationProvider)
let addNotificationRef: ((notification: { type: "referral" | "calendar" | "system"; title: string; body: string }) => void) | null = null;

export function setNotificationAddFunction(fn: typeof addNotificationRef) {
  addNotificationRef = fn;
}

export async function sendSystemNotification(
  title: string,
  body: string,
  type: "referral" | "calendar" | "system" = "system"
) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  // Check DND state - skip notification if enabled
  if (getDNDState()) return;

  // Add to in-app notification tracking (for Referral/Calendar panels)
  if (addNotificationRef) {
    addNotificationRef({ type, title, body });
  }

  const options: NotificationOptions = { body, icon: "/favicon.ico" };

  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.showNotification(title, options);
        return;
      }
    }
    // Fallback for Firefox (supports direct Notification)
    new Notification(title, options);
  } catch (e) {
    console.warn("[notify] Failed to send notification:", e);
  }
}

export function requestNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission === "default") {
    Notification.requestPermission();
  }
}
