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
