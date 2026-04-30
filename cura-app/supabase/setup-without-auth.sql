-- CURA Database Schema - Simplified for Testing Without Authentication
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS referrals CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Profiles table (simplified - no auth dependency)
CREATE TABLE profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  avatar_url TEXT,
  year_level TEXT,
  clinical_department TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Referrals table
CREATE TABLE referrals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  chart_number TEXT NOT NULL,
  treatment TEXT,
  age INTEGER,
  medical_alert TEXT,
  clinical_section_origin TEXT NOT NULL,
  clinical_discipline_origin TEXT,
  treatment_service_origin TEXT,
  clinical_section_destination TEXT NOT NULL,
  clinical_discipline_destination TEXT,
  treatment_service_destination TEXT,
  medical_history TEXT,
  tentative_appointment_schedule TIMESTAMPTZ,
  notes_and_special_indications TEXT,
  status TEXT DEFAULT 'pending',
  accepted_by TEXT DEFAULT 'None',
  edit_request_reason TEXT,
  edit_request_status TEXT,
  last_edited_by TEXT,
  last_edited_at TIMESTAMPTZ,
  referral_status TEXT DEFAULT 'ongoing',
  referral_status_changed_at TIMESTAMPTZ,
  is_featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- Events table (for schedule planner)
CREATE TABLE events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  location TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity logs table
CREATE TABLE activity_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable Row Level Security for testing
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE referrals DISABLE ROW LEVEL SECURITY;
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs DISABLE ROW LEVEL SECURITY;

-- Create test user profiles
INSERT INTO profiles (id, email, first_name, last_name, year_level, clinical_department, role)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'test@example.com',
  'Test',
  'User',
  '5th yr',
  'Prostho',
  'user'
);

INSERT INTO profiles (id, email, first_name, last_name, year_level, clinical_department, role)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'juan@example.com',
  'Juan',
  'Dela Cruz',
  '4th yr',
  'Ortho',
  'user'
);

-- Sample referral created by second user (for testing multi-user dropdown visibility)
INSERT INTO referrals (user_id, chart_number, treatment, age, medical_alert, clinical_section_origin, clinical_discipline_origin, treatment_service_origin, clinical_section_destination, clinical_discipline_destination, treatment_service_destination, notes_and_special_indications, status, accepted_by, is_featured)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  '2026-00001',
  'Orthodontic Braces',
  25,
  'None',
  'Ortho',
  'Orthodontics',
  'Orthodontic Braces',
  'Prostho',
  'Prosthodontics',
  'Removable Partial Dentures',
  'Patient needs prosthetic evaluation after ortho treatment',
  'pending',
  'None',
  false
);

-- Indexes for better performance
CREATE INDEX idx_referrals_user_id ON referrals(user_id);
CREATE INDEX idx_referrals_status ON referrals(status);
CREATE INDEX idx_events_user_id ON events(user_id);
CREATE INDEX idx_events_start_time ON events(start_time);
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- Success message
SELECT 'Database setup complete! You can now create referrals.' as message;
