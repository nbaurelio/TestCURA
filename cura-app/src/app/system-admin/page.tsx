"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * /system-admin entry — sends the user to the default Users Management view.
 */
export default function SystemAdminEntry() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/system-admin/users");
  }, [router]);

  return (
    <div className="flex-1 flex items-center justify-center py-12">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-secondary mx-auto" />
        <p className="mt-3 text-secondary/70 text-xs font-semibold uppercase tracking-wide">
          Loading…
        </p>
      </div>
    </div>
  );
}
