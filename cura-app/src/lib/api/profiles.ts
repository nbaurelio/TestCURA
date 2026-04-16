import { supabase } from "../supabase";

export interface Profile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  year_level?: string;
  clinical_department?: string;
  batch_name?: string;
  role: string;
  created_at: string;
  updated_at: string;
}

// Get user profile by id
export async function getProfile(id: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching profile:", error);
    return null;
  }

  return data;
}

// Get the mock user profile (for testing without auth)
export async function getMockUserProfile(): Promise<Profile | null> {
  const mockUserId = "00000000-0000-0000-0000-000000000000";
  return getProfile(mockUserId);
}

// Update user profile
export async function updateProfile(
  userId: string,
  updates: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>
): Promise<Profile | null> {
  console.log("updateProfile called with:", { userId, updates });
  
  const updateData = {
    ...updates,
    updated_at: new Date().toISOString(),
  };
  
  console.log("Updating profile with data:", updateData);
  
  const profilesTable = supabase.from("profiles") as any;
  
  const { data, error } = await profilesTable
    .update(updateData as any)
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    console.error("Supabase error updating profile:", error);
    console.error("Error details:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    });
    return null;
  }

  console.log("Profile updated successfully:", data);
  return data;
}
