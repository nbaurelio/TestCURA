import { supabase } from "@/lib/supabase";
import { getCurrentUserId } from "@/lib/api/profiles";

// Simple cache for referrals to prevent redundant API calls
let referralsCache: { data: Referral[]; timestamp: number } | null = null;
const CACHE_DURATION = 5000; // 5 seconds

export function clearReferralsCache() {
  referralsCache = null;
}

export interface ReferralFormData {
  chart_number: string;
  treatment?: string;
  age?: number;
  medical_alert?: string;
  clinical_section_origin: string;
  clinical_discipline_origin?: string;
  treatment_service_origin?: string;
  clinical_section_destination: string;
  clinical_discipline_destination?: string;
  treatment_service_destination?: string;
  special_case?: string;
  medical_history?: string;
  tentative_appointment_schedule?: string;
  notes_and_special_indications?: string;
}

function formatChartNumber(year: number, sequence: number) {
  const padded = String(sequence).padStart(5, "0");
  return `${year}-${padded}`;
}

export async function getNextChartNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const yearPrefix = `${year}-`;

  const referralsTable = supabase.from("referrals") as any;

  const { data, error } = await referralsTable
    .select("chart_number")
    .like("chart_number", `${yearPrefix}%`)
    .order("chart_number", { ascending: false })
    .limit(1);

  if (error) {
    throw error;
  }

  const latest = data?.[0]?.chart_number;
  if (!latest) {
    return formatChartNumber(year, 1);
  }

  const match = latest.match(/^\d{4}-(\d{5})$/);
  const lastSeq = match ? Number(match[1]) : 0;
  return formatChartNumber(year, lastSeq + 1);
}

export async function createReferral(data: ReferralFormData, allowDuplicate = false) {
  const mockUserId = getCurrentUserId();

  const referralsTable = supabase.from("referrals") as any;
  const activityLogsTable = supabase.from("activity_logs") as any;

  // Prevent duplicates for new patients only.
  if (!allowDuplicate) {
    const { data: existing, error: existingError } = await referralsTable
      .select("id")
      .eq("chart_number", data.chart_number)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (existing?.id) {
      throw new Error("Chart number exists");
    }
  }

  // Insert the referral
  const { data: referral, error } = await referralsTable
    .insert({
      user_id: mockUserId,
      chart_number: data.chart_number,
      treatment: data.treatment || null,
      age: data.age || null,
      medical_alert: data.medical_alert || null,
      clinical_section_origin: data.clinical_section_origin,
      clinical_discipline_origin: data.clinical_discipline_origin || null,
      treatment_service_origin: data.treatment_service_origin || null,
      clinical_section_destination: data.clinical_section_destination,
      clinical_discipline_destination: data.clinical_discipline_destination || null,
      treatment_service_destination: data.treatment_service_destination || null,
      special_case: data.special_case || null,
      medical_history: data.medical_history || null,
      tentative_appointment_schedule: data.tentative_appointment_schedule || null,
      notes_and_special_indications: data.notes_and_special_indications || null,
      status: "pending",
      accepted_by: "None",
    } as any)
    .select()
    .single();

  if (error) {
    throw error;
  }

  // Log the activity
  await activityLogsTable.insert({
    user_id: mockUserId,
    action: "CREATE_REFERRAL",
    description: `YOU HAVE ADDED A NEW REFERRAL - Chart: ${referral.chart_number}, Destination: ${referral.clinical_section_destination}`,
    metadata: JSON.stringify({
      referral_id: referral.id,
      chart_number: referral.chart_number,
      destination: referral.clinical_section_destination,
      snapshot: referral
    })
  } as any);

  // Clear cache after mutation
  clearReferralsCache();

  return referral;
}

export interface Referral {
  id: string;
  user_id: string;
  chart_number: string;
  treatment: string | null;
  age: number | null;
  medical_alert: string | null;
  clinical_section_origin: string;
  clinical_section_destination: string;
  clinical_discipline_origin?: string | null;
  clinical_discipline_destination?: string | null;
  treatment_service_origin?: string | null;
  treatment_service_destination?: string | null;
  special_case?: string | null;
  tentative_appointment_schedule?: string | null;
  medical_history: string | null;
  notes_and_special_indications: string | null;
  status: string;
  is_featured: boolean;
  accepted_by: string;
  accepted_by_user_id: string | null;
  accepted_at: string | null;
  edit_request_reason: string | null;
  edit_request_status: string | null;
  last_edited_by: string | null;
  last_edited_at: string | null;
  referral_status: string | null;
  referral_status_changed_at: string | null;
  rerefer_request_reason: string | null;
  rerefer_request_status: string | null;
  rerefer_requested_by: string | null;
  rerefer_requested_at: string | null;
  rerefer_approved_by: string | null;
  rerefer_approved_at: string | null;
  rerefer_declined_by: string | null;
  rerefer_declined_at: string | null;
  deletion_request_reason: string | null;
  deletion_request_status: string | null;
  deletion_requested_by: string | null;
  deletion_requested_at: string | null;
  created_at: string;
}

export async function getReferrals(useCache = true): Promise<Referral[]> {
  // Return cached data if valid
  if (useCache && referralsCache && (Date.now() - referralsCache.timestamp) < CACHE_DURATION) {
    return referralsCache.data;
  }

  const { data, error } = await supabase
    .from("referrals")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const result = data || [];
  
  // Update cache
  if (useCache) {
    referralsCache = { data: result, timestamp: Date.now() };
  }

  return result;
}

export async function updateReferral(id: string, updates: Partial<ReferralFormData & { age: number | null; tentative_appointment_schedule: string | null }>) {
  const mockUserId = getCurrentUserId();

  const referralsTable = supabase.from("referrals") as any;
  const activityLogsTable = supabase.from("activity_logs") as any;

  const safeUpdates: Record<string, unknown> = {};
  if (updates.chart_number !== undefined) safeUpdates.chart_number = updates.chart_number;
  if (updates.age !== undefined) safeUpdates.age = updates.age ?? null;
  if (updates.medical_alert !== undefined) safeUpdates.medical_alert = updates.medical_alert || null;
  if (updates.clinical_section_origin !== undefined) safeUpdates.clinical_section_origin = updates.clinical_section_origin;
  if (updates.clinical_discipline_origin !== undefined) safeUpdates.clinical_discipline_origin = updates.clinical_discipline_origin || null;
  if (updates.treatment_service_origin !== undefined) safeUpdates.treatment_service_origin = updates.treatment_service_origin || null;
  if (updates.clinical_section_destination !== undefined) safeUpdates.clinical_section_destination = updates.clinical_section_destination;
  if (updates.clinical_discipline_destination !== undefined) safeUpdates.clinical_discipline_destination = updates.clinical_discipline_destination || null;
  if (updates.treatment_service_destination !== undefined) safeUpdates.treatment_service_destination = updates.treatment_service_destination || null;
  if (updates.special_case !== undefined) safeUpdates.special_case = updates.special_case || null;
  if (updates.tentative_appointment_schedule !== undefined) safeUpdates.tentative_appointment_schedule = updates.tentative_appointment_schedule || null;
  if (updates.notes_and_special_indications !== undefined) safeUpdates.notes_and_special_indications = updates.notes_and_special_indications || null;
  if ((updates as any).edit_request_reason !== undefined) safeUpdates.edit_request_reason = (updates as any).edit_request_reason;
  if ((updates as any).edit_request_status !== undefined) safeUpdates.edit_request_status = (updates as any).edit_request_status;
  if ((updates as any).referral_status !== undefined) {
    safeUpdates.referral_status = (updates as any).referral_status;
    safeUpdates.referral_status_changed_at = new Date().toISOString();
  }

  // Track who edited and when
  safeUpdates.last_edited_by = mockUserId;
  safeUpdates.last_edited_at = new Date().toISOString();

  const { data, error } = await referralsTable
    .update(safeUpdates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  // Log the activity
  const hasStatusChange = (updates as any).referral_status !== undefined;
  await activityLogsTable.insert({
    user_id: mockUserId,
    action: hasStatusChange ? "CHANGE_REFERRAL_STATUS" : "UPDATE_REFERRAL",
    description: hasStatusChange 
      ? `YOU HAVE CHANGED REFERRAL STATUS TO ${(updates as any).referral_status?.toUpperCase()} - Chart: ${data.chart_number || 'N/A'}`
      : `YOU HAVE UPDATED A REFERRAL - Chart: ${data.chart_number || 'N/A'}`,
    metadata: JSON.stringify({
      referral_id: id,
      chart_number: data.chart_number,
      new_status: (updates as any).referral_status,
      snapshot: data
    })
  } as any);

  // Clear cache after mutation
  clearReferralsCache();

  return data;
}

export interface ReferralVersion {
  action: string;
  timestamp: string;
  snapshot: Referral;
}

export async function getReferralHistory(referralId: string): Promise<ReferralVersion[]> {
  const activityLogsTable = supabase.from("activity_logs") as any;

  // First try: fetch all CREATE/UPDATE logs and filter client-side
  const { data, error } = await activityLogsTable
    .select("action, created_at, metadata")
    .in("action", ["CREATE_REFERRAL", "UPDATE_REFERRAL", "REREFER_REQUEST"])
    .order("created_at", { ascending: true });

  if (error) {
    console.error("getReferralHistory query error:", error);
    throw error;
  }

  console.log("getReferralHistory: total logs fetched:", data?.length, "for referral:", referralId);

  const filtered = ((data || []) as any[]).filter((log: any) => {
    try {
      const parsed = typeof log.metadata === "string" ? JSON.parse(log.metadata) : log.metadata;
      return parsed?.referral_id === referralId;
    } catch {
      return false;
    }
  });

  console.log("getReferralHistory: logs matching referral:", filtered.length);

  return filtered
    .map((log: any) => {
      try {
        const parsed = typeof log.metadata === "string" ? JSON.parse(log.metadata) : log.metadata;
        if (!parsed.snapshot) {
          console.log("getReferralHistory: log missing snapshot, action:", log.action);
          return null;
        }
        return {
          action: log.action as string,
          timestamp: log.created_at as string,
          snapshot: parsed.snapshot as Referral,
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean) as ReferralVersion[];
}

export interface StatusChange {
  status: string;
  timestamp: string;
  changedBy: string | null;
}

export async function getReferralStatusHistory(referralId: string): Promise<StatusChange[]> {
  const activityLogsTable = supabase.from("activity_logs") as any;

  // Fetch both status changes and accept logs to resolve the real acceptor for ONGOING
  const [statusRes, acceptRes] = await Promise.all([
    activityLogsTable
      .select("*")
      .eq("action", "CHANGE_REFERRAL_STATUS")
      .order("created_at", { ascending: false }),
    activityLogsTable
      .select("*")
      .eq("action", "ACCEPT_REFERRAL")
      .order("created_at", { ascending: false }),
  ]);

  if (statusRes.error) {
    console.error("Error fetching status history:", statusRes.error);
    return [];
  }

  // Find the acceptor's user_id for this referral
  let acceptorUserId: string | null = null;
  for (const log of (acceptRes.data || []) as any[]) {
    try {
      const parsed = typeof log.metadata === "string" ? JSON.parse(log.metadata) : log.metadata;
      if (parsed?.referral_id === referralId) {
        acceptorUserId = log.user_id as string;
        break;
      }
    } catch {}
  }

  const filtered = ((statusRes.data || []) as any[]).filter((log: any) => {
    try {
      const parsed = typeof log.metadata === "string" ? JSON.parse(log.metadata) : log.metadata;
      return parsed?.referral_id === referralId;
    } catch {
      return false;
    }
  });

  return filtered
    .map((log: any) => {
      try {
        const parsed = typeof log.metadata === "string" ? JSON.parse(log.metadata) : log.metadata;
        const status = parsed?.new_status || "unknown";
        // For the initial ONGOING, use the acceptor's user_id if available
        const changedBy = (status === "ongoing" && acceptorUserId)
          ? (parsed?.accepted_by_user_id || acceptorUserId)
          : log.user_id as string;
        return {
          status,
          timestamp: log.created_at as string,
          changedBy,
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean) as StatusChange[];
}

export async function fixStaleAcceptedBy(realName: string) {
  const referralsTable = supabase.from("referrals") as any;
  await referralsTable
    .update({ accepted_by: realName } as any)
    .eq("is_featured", true)
    .neq("accepted_by", realName)
    .neq("accepted_by", "None");
}

export async function acceptReferral(id: string, acceptedBy: string) {
  const mockUserId = getCurrentUserId();

  const referralsTable = supabase.from("referrals") as any;
  const activityLogsTable = supabase.from("activity_logs") as any;

  const { data, error } = await referralsTable
    .update({
      accepted_by: acceptedBy,
      accepted_at: new Date().toISOString(),
      status: "pending",
      referral_status: "ongoing",
      is_featured: true,
    } as any)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  // Clear cache after mutation
  clearReferralsCache();

  // Log the activity
  await activityLogsTable.insert({
    user_id: mockUserId,
    action: "ACCEPT_REFERRAL",
    description: `YOU HAVE ACCEPTED A REFERRAL - Chart: ${data.chart_number}, Destination: ${data.clinical_section_destination}`,
    metadata: JSON.stringify({
      referral_id: id,
      chart_number: data.chart_number,
      destination: data.clinical_section_destination,
      accepted_by: acceptedBy
    })
  } as any);

  // Log initial status change to ONGOING (accepted_by_user_id tracks the acceptor)
  await activityLogsTable.insert({
    user_id: mockUserId,
    action: "CHANGE_REFERRAL_STATUS",
    description: `YOU HAVE CHANGED REFERRAL STATUS TO ONGOING - Chart: ${data.chart_number || 'N/A'}`,
    metadata: JSON.stringify({
      referral_id: id,
      chart_number: data.chart_number,
      new_status: "ongoing",
      accepted_by_user_id: mockUserId,
      snapshot: data
    })
  } as any);

  return data;
}

export async function approveReferral(id: string) {
  const mockUserId = getCurrentUserId();

  const referralsTable = supabase.from("referrals") as any;
  const activityLogsTable = supabase.from("activity_logs") as any;

  const { data, error } = await referralsTable
    .update({
      status: "approved",
    } as any)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  // Log the activity
  await activityLogsTable.insert({
    user_id: mockUserId,
    action: "APPROVE_REFERRAL",
    description: `YOU HAVE APPROVED A REFERRAL - Chart: ${data.chart_number}, Destination: ${data.clinical_section_destination}`,
    metadata: JSON.stringify({
      referral_id: id,
      chart_number: data.chart_number,
      destination: data.clinical_section_destination,
      approved_by: "Professor"
    })
  } as any);

  return data;
}

export async function deleteReferral(id: string) {
  const referralsTable = supabase.from("referrals") as any;
  const activityLogsTable = supabase.from("activity_logs") as any;

  // First, get the referral details before deleting
  const { data: referral, error: fetchError } = await referralsTable
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError) {
    throw fetchError;
  }

  // Now delete the referral
  const { error } = await referralsTable
    .delete()
    .eq("id", id);

  if (error) {
    throw error;
  }

  // Log the activity with the referral details we captured
  const mockUserId = getCurrentUserId();
  await activityLogsTable.insert({
    user_id: mockUserId,
    action: "DELETE_REFERRAL",
    description: `YOU HAVE DELETED A REFERRAL - Chart: ${referral.chart_number}, Destination: ${referral.clinical_section_destination}`,
    metadata: JSON.stringify({
      referral_id: id,
      chart_number: referral.chart_number,
      destination: referral.clinical_section_destination,
      age: referral.age,
      medical_alert: referral.medical_alert
    })
  } as any);

  // Clear cache after mutation
  clearReferralsCache();

  return true;
}

export async function submitEditRequest(id: string, reason: string) {
  const mockUserId = getCurrentUserId();
  const referralsTable = supabase.from("referrals") as any;
  const activityLogsTable = supabase.from("activity_logs") as any;

  const { data, error } = await referralsTable
    .update({
      edit_request_reason: reason,
      edit_request_status: "pending",
    } as any)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  await activityLogsTable.insert({
    user_id: mockUserId,
    action: "SUBMIT_EDIT_REQUEST",
    description: `EDIT REQUEST SUBMITTED - Chart: ${data.chart_number}, Reason: ${reason}`,
    metadata: JSON.stringify({ referral_id: id, reason })
  } as any);

  return data;
}

export async function approveEditRequest(id: string) {
  const mockUserId = getCurrentUserId();
  const referralsTable = supabase.from("referrals") as any;
  const activityLogsTable = supabase.from("activity_logs") as any;

  const { data, error } = await referralsTable
    .update({
      edit_request_status: "approved",
    } as any)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  await activityLogsTable.insert({
    user_id: mockUserId,
    action: "APPROVE_EDIT_REQUEST",
    description: `EDIT REQUEST APPROVED - Chart: ${data.chart_number}`,
    metadata: JSON.stringify({ referral_id: id })
  } as any);

  return data;
}

export async function declineEditRequest(id: string) {
  const mockUserId = getCurrentUserId();
  const referralsTable = supabase.from("referrals") as any;
  const activityLogsTable = supabase.from("activity_logs") as any;

  const { data, error } = await referralsTable
    .update({
      edit_request_status: "declined",
      edit_request_reason: null,
    } as any)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  await activityLogsTable.insert({
    user_id: mockUserId,
    action: "DECLINE_EDIT_REQUEST",
    description: `EDIT REQUEST DECLINED - Chart: ${data.chart_number}`,
    metadata: JSON.stringify({ referral_id: id })
  } as any);

  return data;
}

export async function submitRereferRequest(id: string, reason: string) {
  const mockUserId = getCurrentUserId();

  const referralsTable = supabase.from("referrals") as any;
  const activityLogsTable = supabase.from("activity_logs") as any;

  // Update referral with rerefer status and reason
  const { data, error } = await referralsTable
    .update({
      rerefer_request_reason: reason,
      rerefer_request_status: "pending",
      rerefer_requested_by: mockUserId,
      rerefer_requested_at: new Date().toISOString(),
    } as any)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  // Log the activity with snapshot for version history
  await activityLogsTable.insert({
    user_id: mockUserId,
    action: "REREFER_REQUEST",
    description: `REREFER REQUEST SUBMITTED - Chart: ${data.chart_number}`,
    metadata: JSON.stringify({
      referral_id: id,
      chart_number: data.chart_number,
      reason: reason,
      snapshot: data,
    })
  } as any);

  // Clear cache after mutation
  clearReferralsCache();

  return data;
}

export async function approveRereferRequest(id: string) {
  const mockUserId = getCurrentUserId();

  const referralsTable = supabase.from("referrals") as any;
  const activityLogsTable = supabase.from("activity_logs") as any;

  // Get current referral data
  const { data: currentData } = await referralsTable
    .select("*")
    .eq("id", id)
    .single();

  // Move to rereferrals by clearing accepted_by and setting status
  const { data, error } = await referralsTable
    .update({
      rerefer_request_status: "approved",
      rerefer_approved_by: mockUserId,
      rerefer_approved_at: new Date().toISOString(),
      accepted_by: "None",
      accepted_at: null,
      status: "pending",
      is_featured: false,
    } as any)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  // Log the activity
  await activityLogsTable.insert({
    user_id: mockUserId,
    action: "APPROVE_REREFER_REQUEST",
    description: `REREFER REQUEST APPROVED - Chart: ${data.chart_number}`,
    metadata: JSON.stringify({
      referral_id: id,
      chart_number: data.chart_number,
      previous_accepted_by: currentData?.accepted_by,
    })
  } as any);

  // Clear cache after mutation
  clearReferralsCache();

  return data;
}

export async function declineRereferRequest(id: string) {
  const mockUserId = getCurrentUserId();

  const referralsTable = supabase.from("referrals") as any;
  const activityLogsTable = supabase.from("activity_logs") as any;

  const { data, error } = await referralsTable
    .update({
      rerefer_request_status: "declined",
      rerefer_declined_by: mockUserId,
      rerefer_declined_at: new Date().toISOString(),
    } as any)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  await activityLogsTable.insert({
    user_id: mockUserId,
    action: "DECLINE_REREFER_REQUEST",
    description: `REREFER REQUEST DECLINED - Chart: ${data.chart_number}`,
    metadata: JSON.stringify({ referral_id: id })
  } as any);

  return data;
}

export async function submitDeletionRequest(id: string, reason: string) {
  const mockUserId = getCurrentUserId();
  const referralsTable = supabase.from("referrals") as any;
  const activityLogsTable = supabase.from("activity_logs") as any;

  const { data, error } = await referralsTable
    .update({
      deletion_request_reason: reason,
      deletion_request_status: "pending",
      deletion_requested_by: mockUserId,
      deletion_requested_at: new Date().toISOString(),
    } as any)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  await activityLogsTable.insert({
    user_id: mockUserId,
    action: "DELETION_REQUEST",
    description: `DELETION REQUEST SUBMITTED - Chart: ${data.chart_number}`,
    metadata: JSON.stringify({
      referral_id: id,
      chart_number: data.chart_number,
      reason,
    })
  } as any);

  clearReferralsCache();
  return data;
}

export async function approveDeletionRequest(id: string) {
  const mockUserId = getCurrentUserId();
  const referralsTable = supabase.from("referrals") as any;
  const activityLogsTable = supabase.from("activity_logs") as any;

  // Fetch referral first to get creator user_id and chart number
  const { data: referral, error: fetchError } = await referralsTable
    .select("user_id, chart_number, deletion_requested_by")
    .eq("id", id)
    .single();

  if (fetchError) throw fetchError;

  // Log approval for the professor
  await activityLogsTable.insert({
    user_id: mockUserId,
    action: "APPROVE_DELETION_REQUEST",
    description: `DELETION REQUEST APPROVED - Chart: ${referral.chart_number}`,
    metadata: JSON.stringify({ referral_id: id, chart_number: referral.chart_number })
  } as any);

  // Log notification for the requester
  if (referral.deletion_requested_by && referral.deletion_requested_by !== mockUserId) {
    await activityLogsTable.insert({
      user_id: referral.deletion_requested_by,
      action: "APPROVE_DELETION_REQUEST",
      description: `YOUR DELETION REQUEST WAS APPROVED - Chart: ${referral.chart_number} has been removed from the system.`,
      metadata: JSON.stringify({ referral_id: id, chart_number: referral.chart_number })
    } as any);
  }

  // Delete the referral
  const { error: deleteError } = await referralsTable.delete().eq("id", id);
  if (deleteError) throw deleteError;

  clearReferralsCache();
}

export async function declineDeletionRequest(id: string) {
  const mockUserId = getCurrentUserId();
  const referralsTable = supabase.from("referrals") as any;
  const activityLogsTable = supabase.from("activity_logs") as any;

  const { data, error } = await referralsTable
    .update({
      deletion_request_status: "declined",
      deletion_request_reason: null,
      deletion_requested_by: null,
      deletion_requested_at: null,
    } as any)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  // Notify the requester
  const requestedBy = (data as any).deletion_requested_by;
  if (requestedBy && requestedBy !== mockUserId) {
    await activityLogsTable.insert({
      user_id: requestedBy,
      action: "DECLINE_DELETION_REQUEST",
      description: `YOUR DELETION REQUEST WAS DECLINED - Chart: ${data.chart_number}`,
      metadata: JSON.stringify({ referral_id: id, chart_number: data.chart_number })
    } as any);
  }

  await activityLogsTable.insert({
    user_id: mockUserId,
    action: "DECLINE_DELETION_REQUEST",
    description: `DELETION REQUEST DECLINED - Chart: ${data.chart_number}`,
    metadata: JSON.stringify({ referral_id: id, chart_number: data.chart_number })
  } as any);

  clearReferralsCache();
  return data;
}

export interface RereferralEvent {
  action: "REREFER_REQUEST" | "APPROVE_REREFER_REQUEST" | "DECLINE_REREFER_REQUEST";
  userId: string;
  timestamp: string;
  reason?: string;
  previousAcceptedBy?: string;
}

export async function getRereferralHistory(referralId: string): Promise<RereferralEvent[]> {
  const activityLogsTable = supabase.from("activity_logs") as any;

  const { data, error } = await activityLogsTable
    .select("*")
    .in("action", ["REREFER_REQUEST", "APPROVE_REREFER_REQUEST", "DECLINE_REREFER_REQUEST"])
    .order("created_at", { ascending: true });

  if (error) throw error;

  // Filter by referral_id from metadata
  const filtered = (data || []).filter((log: any) => {
    try {
      const meta = typeof log.metadata === "string" ? JSON.parse(log.metadata) : log.metadata;
      return meta?.referral_id === referralId;
    } catch {
      return false;
    }
  });

  return filtered.map((log: any) => {
    let meta: any = {};
    try {
      meta = typeof log.metadata === "string" ? JSON.parse(log.metadata) : log.metadata;
    } catch {}
    return {
      action: log.action,
      userId: log.user_id,
      timestamp: log.created_at,
      reason: meta?.reason,
      previousAcceptedBy: meta?.previous_accepted_by,
    };
  });
}
