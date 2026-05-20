import { supabase } from "@/lib/supabase";
import { getCurrentUserId } from "@/lib/api/profiles";

export interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  description: string;
  created_at: string;
  metadata?: string;
}

export async function getActivityLogs() {
  const mockUserId = getCurrentUserId();

  const { data, error } = await supabase
    .from("activity_logs")
    .select("*")
    .eq("user_id", mockUserId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

// System-wide activity logs (no user filter). Used by System Admin dashboard.
export async function getAllActivityLogs(): Promise<ActivityLog[]> {
  const { data, error } = await supabase
    .from("activity_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5000);

  if (error) {
    console.error("Error fetching all activity logs:", error);
    return [];
  }

  return (data as ActivityLog[]) || [];
}
