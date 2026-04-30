"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function RootPage() {
  const router = useRouter();
  const { isLoggedIn, role, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!isLoggedIn) {
      router.push("/login");
    } else if (role === "professor") {
      router.push("/professor");
    } else {
      router.push("/home");
    }
  }, [loading, isLoggedIn, role, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
}
