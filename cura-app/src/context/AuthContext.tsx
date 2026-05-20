"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Profile, getProfile, clearProfileCache } from "@/lib/api/profiles";
import { useRouter } from "next/navigation";

interface AuthContextType {
  user: Profile | null;
  loading: boolean;
  role: string | null;
  isLoggedIn: boolean;
  refreshUser: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  role: null,
  isLoggedIn: false,
  refreshUser: async () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const loadUser = useCallback(async () => {
    try {
      const userId = typeof window !== "undefined"
        ? localStorage.getItem("currentUserId")
        : null;

      if (!userId) {
        setUser(null);
        setLoading(false);
        return;
      }

      const profile = await getProfile(userId);
      setUser(profile);
    } catch (error) {
      console.error("Error loading user:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const logout = useCallback(() => {
    localStorage.removeItem("currentUserId");
    clearProfileCache();
    setUser(null);
    router.push("/login");
  }, [router]);

  const value: AuthContextType = {
    user,
    loading,
    role: user?.role || null,
    isLoggedIn: !!user,
    refreshUser: loadUser,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
