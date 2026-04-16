import { supabase } from "@/lib/supabase";

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
  // For now, use a mock user_id until authentication is implemented
  // TODO: Replace with actual authenticated user ID
  const mockUserId = "00000000-0000-0000-0000-000000000000";

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
      destination: referral.clinical_section_destination
    })
  } as any);

  return referral;
}

export interface Referral {
  id: string;
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
  created_at: string;
}

export async function getReferrals(): Promise<Referral[]> {
  const { data, error } = await supabase
    .from("referrals")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function updateReferral(id: string, updates: Partial<ReferralFormData>) {
  const mockUserId = "00000000-0000-0000-0000-000000000000";

  const referralsTable = supabase.from("referrals") as any;
  const activityLogsTable = supabase.from("activity_logs") as any;

  const { data, error } = await referralsTable
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
    action: "UPDATE_REFERRAL",
    description: `YOU HAVE UPDATED A REFERRAL - Chart: ${data.chart_number || 'N/A'}`,
    metadata: JSON.stringify({
      referral_id: id,
      chart_number: data.chart_number
    })
  } as any);

  return data;
}

export async function acceptReferral(id: string, acceptedBy: string) {
  const mockUserId = "00000000-0000-0000-0000-000000000000";

  const referralsTable = supabase.from("referrals") as any;
  const activityLogsTable = supabase.from("activity_logs") as any;

  const { data, error } = await referralsTable
    .update({
      accepted_by: acceptedBy,
      status: "pending",
      is_featured: true,
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
    action: "ACCEPT_REFERRAL",
    description: `YOU HAVE ACCEPTED A REFERRAL - Chart: ${data.chart_number}, Destination: ${data.clinical_section_destination}`,
    metadata: JSON.stringify({
      referral_id: id,
      chart_number: data.chart_number,
      destination: data.clinical_section_destination,
      accepted_by: acceptedBy
    })
  } as any);

  return data;
}

export async function approveReferral(id: string) {
  const mockUserId = "00000000-0000-0000-0000-000000000000";

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
  const mockUserId = "00000000-0000-0000-0000-000000000000";
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

  return true;
}
