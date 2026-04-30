import { supabase } from "@/lib/supabase";
import { getCurrentUserId } from "@/lib/api/profiles";

export interface ReferralNotification {
  id: string;
  action: string;
  description: string;
  created_at: string;
  metadata?: any;
  read: boolean;
}

export interface CalendarNotification {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  location?: string;
  patient_name?: string;
  isUpcoming: boolean;
}

// Fetch referral-related activity logs for the current user
export async function getReferralNotifications(): Promise<ReferralNotification[]> {
  const userId = getCurrentUserId();
  const activityLogsTable = supabase.from("activity_logs") as any;

  const referralActions = [
    "CREATE_REFERRAL",
    "UPDATE_REFERRAL",
    "ACCEPT_REFERRAL",
    "DELETE_REFERRAL",
    "APPROVE_EDIT_REQUEST",
    "DECLINE_EDIT_REQUEST",
    "REREFER_REQUEST",
    "APPROVE_REREFER_REQUEST",
    "DECLINE_REREFER_REQUEST",
    "DELETION_REQUEST",
    "APPROVE_DELETION_REQUEST",
    "DECLINE_DELETION_REQUEST",
  ];

  const { data, error } = await activityLogsTable
    .select("*")
    .eq("user_id", userId)
    .in("action", referralActions)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("Error fetching referral notifications:", error);
    return [];
  }

  return (data || []).map((log: any) => ({
    id: log.id,
    action: log.action,
    description: log.description,
    created_at: log.created_at,
    metadata: log.metadata ? (typeof log.metadata === "string" ? JSON.parse(log.metadata) : log.metadata) : null,
    read: false,
  }));
}

// Fetch upcoming events for the current user as calendar notifications
export async function getCalendarNotifications(): Promise<CalendarNotification[]> {
  const userId = getCurrentUserId();

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("user_id", userId)
    .gte("start_time", new Date().toISOString())
    .order("start_time", { ascending: true })
    .limit(20);

  if (error) {
    console.error("Error fetching calendar notifications:", error);
    return [];
  }

  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  return (data || []).map((event: any) => ({
    id: event.id,
    title: event.title,
    start_time: event.start_time,
    end_time: event.end_time,
    location: event.location,
    patient_name: event.patient_name,
    isUpcoming: new Date(event.start_time) <= in24h,
  }));
}

// Format action label for display
export function formatActionLabel(action: string): string {
  const labels: Record<string, string> = {
    CREATE_REFERRAL: "New Referral Created",
    UPDATE_REFERRAL: "Referral Updated",
    ACCEPT_REFERRAL: "Referral Accepted",
    DELETE_REFERRAL: "Referral Deleted",
    APPROVE_EDIT_REQUEST: "Edit Request Approved",
    DECLINE_EDIT_REQUEST: "Edit Request Declined",
    REREFER_REQUEST: "Rerefer Requested",
    APPROVE_REREFER_REQUEST: "Rerefer Approved",
    DECLINE_REREFER_REQUEST: "Rerefer Declined",
    DELETION_REQUEST: "Deletion Requested",
    APPROVE_DELETION_REQUEST: "Deletion Request Approved",
    DECLINE_DELETION_REQUEST: "Deletion Request Declined",
  };
  return labels[action] || action;
}

// Get color for action badge
export function getActionColor(action: string): string {
  if (action.includes("APPROVE") || action === "ACCEPT_REFERRAL") return "bg-green-100 text-green-700";
  if (action.includes("DECLINE") || action === "DELETE_REFERRAL") return "bg-red-100 text-red-700";
  if (action.includes("REREFER")) return "bg-amber-100 text-amber-700";
  if (action.includes("DELETION")) return "bg-red-100 text-red-700";
  return "bg-blue-100 text-blue-700";
}
