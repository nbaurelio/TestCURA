"use client";

import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "sonner";
import { ScrollToTop } from "@/components/ui/ScrollToTop";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <ScrollToTop />
      <Toaster
        position="top-center"
        richColors
        closeButton
        toastOptions={{ duration: 4000 }}
      />
    </AuthProvider>
  );
}
