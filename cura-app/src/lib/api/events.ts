import { supabase } from "@/lib/supabase";
import { getCurrentUserId } from "@/lib/api/profiles";

// Simple cache for events - persistent across page navigations
interface EventsCache {
  data: any[];
  timestamp: number;
  userId: string;
}
let eventsCache: EventsCache | null = null;
let hasInitiallyLoaded = false;

export function clearEventsCache() {
  eventsCache = null;
  hasInitiallyLoaded = false;
}

export function hasEventsCache(): boolean {
  return hasInitiallyLoaded && eventsCache !== null;
}

export interface EventFormData {
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  location?: string;
  patient_name?: string;
  color?: string;
  notes?: string;
  medical_alert?: string;
  is_favorite?: boolean;
  status?: string;
  source?: string;
}

export async function createEvent(data: EventFormData) {
  const mockUserId = getCurrentUserId();

  const eventsTable = supabase.from("events") as any;
  const activityLogsTable = supabase.from("activity_logs") as any;

  // Insert the event
  const { data: event, error } = await eventsTable
    .insert({
      user_id: mockUserId,
      title: data.title,
      description: data.description,
      start_time: data.start_time,
      end_time: data.end_time,
      location: data.location,
      patient_name: data.patient_name,
      color: data.color,
      notes: data.notes,
      medical_alert: data.medical_alert,
      is_favorite: data.is_favorite || false,
      status: data.status || 'scheduled',
      source: data.source || 'manual',
    } as any)
    .select()
    .single();

  if (error) {
    throw error;
  }

  // Clear cache after mutation
  clearEventsCache();

  // Log the activity
  await activityLogsTable.insert({
    user_id: mockUserId,
    action: "CREATE_EVENT",
    description: `YOU HAVE ADDED A NEW EVENT: ${data.title}`,
    metadata: JSON.stringify({
      event_id: event.id,
      title: data.title,
      description: data.description,
      location: data.location,
      start_time: data.start_time,
      end_time: data.end_time
    })
  } as any);

  return event;
}

export async function getEvents(useCache = true) {
  const mockUserId = getCurrentUserId();

  // Return cached data immediately if available (persistent across navigations)
  if (useCache && hasInitiallyLoaded && eventsCache && eventsCache.userId === mockUserId) {
    return eventsCache.data;
  }

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("user_id", mockUserId)
    .order("start_time", { ascending: true });

  if (error) {
    throw error;
  }

  // Update cache and mark as loaded
  if (useCache) {
    eventsCache = { data: data || [], timestamp: Date.now(), userId: mockUserId };
    hasInitiallyLoaded = true;
  }

  return data;
}

export async function updateEvent(id: string, updates: Partial<EventFormData>) {
  const mockUserId = getCurrentUserId();

  const eventsTable = supabase.from("events") as any;
  const activityLogsTable = supabase.from("activity_logs") as any;

  const { data, error } = await eventsTable
    .update(updates as any)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  // Log status change if status was updated
  if (updates.status) {
    await (supabase.from("event_status_history" as any) as any).insert({
      event_id: id,
      status: updates.status,
      changed_by: mockUserId,
    });
  }

  // Clear cache after mutation
  clearEventsCache();

  // Log the activity
  await activityLogsTable.insert({
    user_id: mockUserId,
    action: "UPDATE_EVENT",
    description: `YOU HAVE UPDATED AN EVENT: ${data.title || 'Untitled'}`,
    metadata: JSON.stringify({
      event_id: id,
      title: data.title,
      description: data.description,
      location: data.location,
      start_time: data.start_time,
      end_time: data.end_time
    })
  } as any);

  return data;
}

export async function getAllReferralEvents(): Promise<any[]> {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .or("source.eq.referral,title.like.Referral Appointment%")
    .order("start_time", { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function getAdviseeEvents(adviseeIds: string[]): Promise<any[]> {
  if (!adviseeIds || adviseeIds.length === 0) return [];

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .or(`source.eq.referral,title.like.Referral Appointment%`)
    .in("user_id", adviseeIds)
    .order("start_time", { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

export interface EventStatusChange {
  status: string;
  changed_at: string;
  changed_by: string | null;
}

export async function getEventStatusHistory(eventId: string): Promise<EventStatusChange[]> {
  const { data, error } = await (supabase.from("event_status_history" as any) as any)
    .select("status, changed_at, changed_by")
    .eq("event_id", eventId)
    .order("changed_at", { ascending: true });

  if (error) return [];
  return data || [];
}

export async function getEventOverrides(professorId: string): Promise<Record<string, { color?: string; is_favorite?: boolean }>> {
  const { data, error } = await supabase
    .from("event_overrides" as any)
    .select("event_id, color, is_favorite")
    .eq("professor_id", professorId);

  if (error) return {};

  const map: Record<string, { color?: string; is_favorite?: boolean }> = {};
  (data || []).forEach((row: any) => {
    map[row.event_id] = { color: row.color, is_favorite: row.is_favorite };
  });
  return map;
}

export async function upsertEventOverride(professorId: string, eventId: string, overrides: { color?: string; is_favorite?: boolean }) {
  const { error } = await (supabase.from("event_overrides" as any) as any)
    .upsert({
      professor_id: professorId,
      event_id: eventId,
      ...overrides,
      updated_at: new Date().toISOString(),
    }, { onConflict: "professor_id,event_id" });

  if (error) throw error;
}

export async function deleteEvent(id: string) {
  const mockUserId = getCurrentUserId();

  const eventsTable = supabase.from("events") as any;
  const activityLogsTable = supabase.from("activity_logs") as any;

  // First, get the event details before deleting
  const { data: event, error: fetchError } = await eventsTable
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError) {
    throw fetchError;
  }

  // Now delete the event
  const { error } = await eventsTable
    .delete()
    .eq("id", id);

  if (error) {
    throw error;
  }

  // Log the activity with the event details we captured
  await activityLogsTable.insert({
    user_id: mockUserId,
    action: "DELETE_EVENT",
    description: `YOU HAVE DELETED AN EVENT: ${event.title}`,
    metadata: JSON.stringify({
      event_id: id,
      title: event.title,
      description: event.description,
      location: event.location,
      start_time: event.start_time,
      end_time: event.end_time
    })
  } as any);

  // Clear cache after mutation
  clearEventsCache();

  return true;
}
