import { supabase } from "@/lib/supabase";
import { getCurrentUserId, getProfile } from "@/lib/api/profiles";

// DND (Do Not Disturb) state - persisted in localStorage
const DND_KEY = "cura_notifications_dnd";

export function getDNDState(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(DND_KEY) === "true";
}

export function setDNDState(enabled: boolean): void {
  if (typeof window === "undefined") return;
  if (enabled) {
    localStorage.setItem(DND_KEY, "true");
  } else {
    localStorage.removeItem(DND_KEY);
  }
}

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
  isRecent?: boolean;
}

// Fetch referral-related activity logs for the current user
// For clinical chairs, also fetch notifications for all clinicians in their section
export async function getReferralNotifications(): Promise<ReferralNotification[]> {
  const userId = getCurrentUserId();
  const currentUser = await getProfile(userId);
  const activityLogsTable = supabase.from("activity_logs") as any;

  // Check DND state - return empty if enabled
  if (getDNDState()) {
    return [];
  }

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
    // Status-change approve/decline rows are written by `professor/page.tsx`
    // with `user_id = professorId`, so including the action surfaces them in
    // the professor's bell panel.
    "CHANGE_REFERRAL_STATUS",
    // Incoming-request rows written by `notifyRoutedProfessors` so each
    // routed professor sees a notification when a clinician submits an
    // edit / rerefer / deletion / status-change request.
    "INCOMING_EDIT_REQUEST",
    "INCOMING_REREFER_REQUEST",
    "INCOMING_DELETION_REQUEST",
    "INCOMING_STATUS_CHANGE_REQUEST",
  ];

  // Base query for user's own notifications
  let query = activityLogsTable
    .select("*")
    .eq("user_id", userId)
    .in("action", referralActions);

  const { data: ownData, error: ownError } = await query
    .order("created_at", { ascending: false })
    .limit(20);

  if (ownError) {
    console.error("Error fetching referral notifications:", ownError);
    return [];
  }

  let allNotifications = (ownData || []).map((log: any) => ({
    id: log.id,
    action: log.action,
    description: log.description,
    created_at: log.created_at,
    metadata: log.metadata ? (typeof log.metadata === "string" ? JSON.parse(log.metadata) : log.metadata) : null,
    read: false,
  }));

  // For clinical chairs, fetch notifications from ALL clinicians across all sections
  if (currentUser?.role === "clinical_admin") {
    // Get ALL clinicians (regardless of department)
    const { data: allClinicians } = await supabase
      .from("profiles")
      .select("id, clinical_department")
      .eq("role", "clinician");

    if (allClinicians && allClinicians.length > 0) {
      const clinicianIds = allClinicians.map((p: any) => p.id);

      // Get notifications for all clinicians (requests they sent)
      const { data: sectionData } = await activityLogsTable
        .select("*")
        .in("user_id", clinicianIds)
        .in("action", ["REREFER_REQUEST", "DELETION_REQUEST", "CHANGE_REFERRAL_STATUS"])
        .order("created_at", { ascending: false })
        .limit(30);

      if (sectionData) {
        // Build a map of clinician ID to department for labeling
        const clinicianDeptMap = new Map(allClinicians.map((p: any) => [p.id, p.clinical_department]));

        const sectionNotifications = sectionData.map((log: any) => {
          const dept = clinicianDeptMap.get(log.user_id);
          const deptLabel = dept ? `[${dept}]` : "[Section]";
          return {
            id: `section-${log.id}`,
            action: log.action,
            description: `${deptLabel} ${log.description}`,
            created_at: log.created_at,
            metadata: log.metadata ? (typeof log.metadata === "string" ? JSON.parse(log.metadata) : log.metadata) : null,
            read: false,
          };
        });

        // Merge and sort by date (newest first), remove duplicates by id
        allNotifications = [...allNotifications, ...sectionNotifications]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 30);
      }
    }
  }

  return allNotifications;
}

// Fetch upcoming favorited events for the current user as calendar notifications.
// Professors may also have favorites stored in event_overrides — we fetch those
// separately and merge so the dropdown reflects the same set as the planner.
export async function getCalendarNotifications(): Promise<CalendarNotification[]> {
  const userId = getCurrentUserId();

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  // 1. Own events that are favorited
  const { data: ownData, error: ownError } = await supabase
    .from("events")
    .select("*")
    .eq("user_id", userId)
    .eq("is_favorite", true)
    .gte("start_time", oneHourAgo)
    .order("start_time", { ascending: true })
    .limit(20);

  if (ownError) {
    console.error("Error fetching calendar notifications:", ownError);
    return [];
  }

  // 2. Events favorited via event_overrides (professor favorites on other users' events)
  const { data: overrideData, error: overrideError } = await (supabase
    .from("event_overrides" as any) as any)
    .select("event_id")
    .eq("professor_id", userId)
    .eq("is_favorite", true);

  let overrideEvents: any[] = [];
  if (!overrideError && overrideData && overrideData.length > 0) {
    const eventIds = overrideData.map((o: any) => o.event_id);
    const { data: evData } = await supabase
      .from("events")
      .select("*")
      .in("id", eventIds)
      .gte("start_time", oneHourAgo)
      .order("start_time", { ascending: true })
      .limit(20);
    overrideEvents = evData || [];
  }

  // Merge, deduplicate by id, sort by start_time ascending
  const ownIds = new Set((ownData || []).map((e: any) => e.id));
  const merged = [
    ...(ownData || []),
    ...overrideEvents.filter((e: any) => !ownIds.has(e.id)),
  ].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
   .slice(0, 20);

  const now = new Date();

  return merged.map((event: any) => {
    const startMs = new Date(event.start_time).getTime();
    return {
      id: event.id,
      title: event.title,
      start_time: event.start_time,
      end_time: event.end_time,
      location: event.location,
      patient_name: event.patient_name,
      isUpcoming: startMs > now.getTime(),
      isRecent: startMs <= now.getTime(),
    };
  });
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
    CHANGE_REFERRAL_STATUS: "Status Change",
    INCOMING_EDIT_REQUEST: "New Edit Request",
    INCOMING_REREFER_REQUEST: "New Rerefer Request",
    INCOMING_DELETION_REQUEST: "New Deletion Request",
    INCOMING_STATUS_CHANGE_REQUEST: "New Status Change Request",
  };
  return labels[action] || action;
}

// Get color for action badge
export function getActionColor(action: string): string {
  // Incoming requests (newly received) — neutral blue so they read as
  // "something needs your attention" without conflicting with approve/decline.
  if (action.startsWith("INCOMING_")) return "bg-blue-100 text-blue-700";
  if (action.includes("APPROVE") || action === "ACCEPT_REFERRAL") return "bg-green-100 text-green-700";
  if (action.includes("DECLINE") || action === "DELETE_REFERRAL") return "bg-red-100 text-red-700";
  if (action.includes("REREFER")) return "bg-amber-100 text-amber-700";
  if (action.includes("DELETION")) return "bg-red-100 text-red-700";
  return "bg-blue-100 text-blue-700";
}
