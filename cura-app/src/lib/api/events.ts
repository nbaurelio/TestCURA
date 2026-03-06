import { supabase } from "@/lib/supabase";

export interface EventFormData {
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  location?: string;
  notes?: string;
}

export async function createEvent(data: EventFormData) {
  const mockUserId = "00000000-0000-0000-0000-000000000000";

  // Insert the event
  const { data: event, error } = await supabase
    .from("events")
    .insert({
      user_id: mockUserId,
      title: data.title,
      description: data.description,
      start_time: data.start_time,
      end_time: data.end_time,
      location: data.location,
      notes: data.notes,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  // Log the activity
  await supabase.from("activity_logs").insert({
    user_id: mockUserId,
    action: "CREATE_EVENT",
    description: `YOU HAVE ADDED A NEW EVENT: ${data.title}`,
  });

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

  const { data, error } = await supabase
    .from("events")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  // Log the activity
  await supabase.from("activity_logs").insert({
    user_id: mockUserId,
    action: "UPDATE_EVENT",
    description: `YOU HAVE UPDATED AN EVENT`,
  });

  return data;
}

export async function deleteEvent(id: string) {
  const mockUserId = "00000000-0000-0000-0000-000000000000";

  const { error } = await supabase
    .from("events")
    .delete()
    .eq("id", id);

  if (error) {
    throw error;
  }

  // Log the activity
  await supabase.from("activity_logs").insert({
    user_id: mockUserId,
    action: "DELETE_EVENT",
    description: `YOU HAVE DELETED AN EVENT`,
  });

  return true;
}
