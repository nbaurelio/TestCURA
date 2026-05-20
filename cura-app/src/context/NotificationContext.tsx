"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { getDNDState } from "@/lib/api/notifications";
import { setNotificationAddFunction } from "@/lib/utils/notify";

export interface SystemNotification {
  id: string;
  type: "referral" | "calendar" | "system";
  title: string;
  body: string;
  created_at: string;
  read: boolean;
}

interface NotificationContextType {
  recentNotifications: SystemNotification[];
  addNotification: (notification: Omit<SystemNotification, "id" | "created_at" | "read">) => void;
  markAsRead: (id: string) => void;
  clearNotifications: () => void;
  unreadCount: number;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [recentNotifications, setRecentNotifications] = useState<SystemNotification[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("cura_recent_notifications");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Only keep notifications from last 24 hours
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        const filtered = parsed.filter((n: SystemNotification) => new Date(n.created_at).getTime() > cutoff);
        setRecentNotifications(filtered);
      } catch {
        // ignore parse errors
      }
    }
  }, []);

  // Persist to localStorage when changed
  useEffect(() => {
    localStorage.setItem("cura_recent_notifications", JSON.stringify(recentNotifications));
  }, [recentNotifications]);

  // Stable ref for addNotification to avoid circular dependency
  const addNotificationRef = React.useRef<(notification: Omit<SystemNotification, "id" | "created_at" | "read">) => void>();

  const addNotification = useCallback((notification: Omit<SystemNotification, "id" | "created_at" | "read">) => {
    // Don't add if DND is enabled (but still allow system notification to be skipped elsewhere)
    if (getDNDState()) return;

    const newNotification: SystemNotification = {
      ...notification,
      id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
      read: false,
    };

    setRecentNotifications(prev => [newNotification, ...prev].slice(0, 50)); // Keep last 50
  }, []);

  // Keep ref in sync
  addNotificationRef.current = addNotification;

  // Register with notify utility
  useEffect(() => {
    setNotificationAddFunction(({ type, title, body }) => {
      addNotificationRef.current?.({ type, title, body });
    });
    return () => {
      setNotificationAddFunction(null);
    };
  }, []);

  const markAsRead = useCallback((id: string) => {
    setRecentNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const clearNotifications = useCallback(() => {
    setRecentNotifications([]);
  }, []);

  const unreadCount = recentNotifications.filter(n => !n.read && n.type === "referral").length;

  return (
    <NotificationContext.Provider
      value={{ recentNotifications, addNotification, markAsRead, clearNotifications, unreadCount }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotificationContext must be used within NotificationProvider");
  }
  return context;
}
