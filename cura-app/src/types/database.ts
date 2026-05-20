export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          first_name: string;
          last_name: string;
          avatar_url: string | null;
          year_level: string | null;
          clinical_department: string | null;
          batch_name: string | null;
          role: string;
          subrole: string | null;
          adviser_ids: string[] | null;
          password: string | null;
          status: string;
          failed_login_attempts: number;
          last_active_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          first_name: string;
          last_name: string;
          avatar_url?: string | null;
          year_level?: string | null;
          clinical_department?: string | null;
          batch_name?: string | null;
          role?: string;
          subrole?: string | null;
          adviser_ids?: string[] | null;
          password?: string | null;
          status?: string;
          failed_login_attempts?: number;
          last_active_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          first_name?: string;
          last_name?: string;
          avatar_url?: string | null;
          year_level?: string | null;
          clinical_department?: string | null;
          batch_name?: string | null;
          role?: string;
          subrole?: string | null;
          adviser_ids?: string[] | null;
          password?: string | null;
          status?: string;
          failed_login_attempts?: number;
          last_active_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      referrals: {
        Row: {
          id: string;
          user_id: string;
          chart_number: string;
          treatment: string | null;
          age: number | null;
          medical_alert: string | null;
          clinical_section_origin: string;
          clinical_section_destination: string;
          medical_history: string | null;
          tentative_appointment_schedule: string | null;
          notes_and_special_indications: string | null;
          status: string;
          accepted_by: string;
          accepted_at: string | null;
          is_featured: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          chart_number: string;
          treatment?: string | null;
          age?: number | null;
          medical_alert?: string | null;
          clinical_section_origin: string;
          clinical_section_destination: string;
          medical_history?: string | null;
          tentative_appointment_schedule?: string | null;
          notes_and_special_indications?: string | null;
          status?: string;
          accepted_by?: string;
          accepted_at?: string | null;
          is_featured?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          chart_number?: string;
          treatment?: string | null;
          age?: number | null;
          medical_alert?: string | null;
          clinical_section_origin?: string;
          clinical_section_destination?: string;
          medical_history?: string | null;
          tentative_appointment_schedule?: string | null;
          notes_and_special_indications?: string | null;
          status?: string;
          accepted_by?: string;
          accepted_at?: string | null;
          is_featured?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      events: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          start_time: string;
          end_time: string;
          location: string | null;
          notes: string | null;
          color: string | null;
          patient_name: string | null;
          medical_alert: string | null;
          is_favorite: boolean;
          status: string | null;
          source: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          start_time: string;
          end_time: string;
          location?: string | null;
          notes?: string | null;
          color?: string | null;
          patient_name?: string | null;
          medical_alert?: string | null;
          is_favorite?: boolean;
          status?: string | null;
          source?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          start_time?: string;
          end_time?: string;
          location?: string | null;
          notes?: string | null;
          color?: string | null;
          patient_name?: string | null;
          medical_alert?: string | null;
          is_favorite?: boolean;
          status?: string | null;
          source?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      activity_logs: {
        Row: {
          id: string;
          user_id: string;
          action: string;
          description: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          action: string;
          description: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          action?: string;
          description?: string;
          created_at?: string;
        };
      };
    };
  };
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Referral = Database["public"]["Tables"]["referrals"]["Row"];
export type Event = Database["public"]["Tables"]["events"]["Row"];
export type ActivityLog = Database["public"]["Tables"]["activity_logs"]["Row"];
