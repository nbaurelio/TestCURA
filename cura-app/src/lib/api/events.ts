import { supabase } from "@/lib/supabase";

export interface EventFormData {
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  location?: string;
  patient_name?: string;
  color?: string;
  notes?: string;
}

export async function createEvent(data: EventFormData) {
  const mockUserId = "00000000-0000-0000-0000-000000000000";

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
    } as any)
    .select()
    .single();

  if (error) {
    throw error;
  }

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

export async function getEvents() {
  const mockUserId = "00000000-0000-0000-0000-000000000000";

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("user_id", mockUserId)
    .order("start_time", { ascending: true });

  if (error) {
    throw error;
  }

  return data;
}

export async function updateEvent(id: string, updates: Partial<EventFormData>) {
  const mockUserId = "00000000-0000-0000-0000-000000000000";

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

export async function deleteEvent(id: string) {
  const mockUserId = "00000000-0000-0000-0000-000000000000";

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

  return true;
}
