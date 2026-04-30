"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface RouteGuardProps {
  allowedRoles: string[];
  children: React.ReactNode;
}

export function RouteGuard({ allowedRoles, children }: RouteGuardProps) {
  const { user, loading, role, isLoggedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    // Not logged in → redirect to login
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }

    // Wrong role → redirect to their dashboard
    if (role && !allowedRoles.includes(role)) {
      if (role === "professor") {
        router.push("/professor");
      } else {
        router.push("/home");
      }
    }
  }, [loading, isLoggedIn, role, allowedRoles, router]);

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary mx-auto"></div>
          <p className="mt-4 text-gray-600 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // Not logged in or wrong role → show nothing (redirect is happening)
  if (!isLoggedIn || !role || !allowedRoles.includes(role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary mx-auto"></div>
          <p className="mt-4 text-gray-600 text-sm">Redirecting...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
