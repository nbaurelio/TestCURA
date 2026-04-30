import { supabase } from "../supabase";

// Simple cache for profile - persistent across page navigations
let profileCache: { data: Profile | null; timestamp: number } | null = null;
let hasInitiallyLoaded = false;

export function clearProfileCache() {
  profileCache = null;
  hasInitiallyLoaded = false;
}

export function hasProfileCache(): boolean {
  return hasInitiallyLoaded && profileCache !== null;
}

// Get cached profile data synchronously (for initial state)
export function getCachedProfile(): Profile | null {
  return profileCache?.data || null;
}

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
  adviser_id?: string | null;
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

// Get current user ID from localStorage (falls back to mock user)
export function getCurrentUserId(): string {
  if (typeof window !== "undefined") {
    return localStorage.getItem("currentUserId") || "00000000-0000-0000-0000-000000000000";
  }
  return "00000000-0000-0000-0000-000000000000";
}

// Get the mock user profile (for testing without auth)
export async function getMockUserProfile(useCache = true): Promise<Profile | null> {
  const userId = getCurrentUserId();
  
  // Return cached data immediately if available (persistent across navigations)
  if (useCache && hasInitiallyLoaded && profileCache) {
    return profileCache.data;
  }
  
  const profile = await getProfile(userId);
  
  // Update cache and mark as loaded
  if (useCache) {
    profileCache = { data: profile, timestamp: Date.now() };
    hasInitiallyLoaded = true;
  }
  
  return profile;
}

// Synchronous version for initial state (returns cached data or null)
export function getMockUserProfileSync(): Profile | null {
  return profileCache?.data || null;
}

// Get advisees for a professor (profiles where adviser_id matches the professor's ID)
export async function getAdvisees(professorId: string): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("adviser_id", professorId)
    .order("last_name", { ascending: true });

  if (error) {
    console.error("Error fetching advisees:", error);
    return [];
  }

  return data || [];
}

// Get all profiles
export async function getAllProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("last_name", { ascending: true });

  if (error) {
    console.error("Error fetching all profiles:", error);
    return [];
  }

  return data || [];
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
  
  // Clear cache after update
  clearProfileCache();
  
  return data;
}
