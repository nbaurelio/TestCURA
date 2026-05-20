-- ═══════════════════════════════════════════════════════════════════════════
-- CURA — FRESH FULL-COVERAGE SEED
-- ───────────────────────────────────────────────────────────────────────────
-- Wipes profiles / referrals / events / activity_logs and re-seeds with:
--   • 52 user accounts (System Admin, 2 Clinical Admins, 4 Professors,
--     40 Clinicians) covering ACTIVE / INACTIVE / LOCKED states, lockout
--     counters, advisers, batch names, departments and year levels.
--   • 110 referrals exercising every field, every status, every request
--     type (edit / re-refer / deletion — pending / approved / declined),
--     special cases, medical alerts, and cross-section combos.
--   • 110 schedule events exercising all 9 colors, multi-day spread,
--     overlapping slots, patient_name + rich notes + medical_alert.
--   • Activity logs for every action type the notifications feed reads.
--
-- Run this file in the Supabase SQL Editor. Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 0. Defensive column additions (idempotent) ────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subrole TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS adviser_ids TEXT[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS batch_name TEXT;

ALTER TABLE referrals ADD COLUMN IF NOT EXISTS sex TEXT;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS clinical_discipline_origin TEXT;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS treatment_service_origin TEXT;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS clinical_discipline_destination TEXT;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS treatment_service_destination TEXT;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS special_case TEXT;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS accepted_by_user_id UUID;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS edit_request_reason TEXT;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS edit_request_status TEXT;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS edit_request_decline_reason TEXT;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS edit_request_professor_ids UUID[];
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS last_edited_by TEXT;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMPTZ;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS referral_status TEXT DEFAULT 'ongoing';
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS referral_status_changed_at TIMESTAMPTZ;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS rerefer_request_reason TEXT;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS rerefer_request_status TEXT;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS rerefer_request_professor_ids UUID[];
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS rerefer_requested_by UUID;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS rerefer_requested_at TIMESTAMPTZ;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS rerefer_approved_by UUID;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS rerefer_approved_at TIMESTAMPTZ;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS rerefer_declined_by UUID;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS rerefer_declined_at TIMESTAMPTZ;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS deletion_request_reason TEXT;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS deletion_request_status TEXT;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS deletion_request_decline_reason TEXT;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS deletion_request_professor_ids UUID[];
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS deletion_requested_by UUID;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMPTZ;

ALTER TABLE events ADD COLUMN IF NOT EXISTS patient_name TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS medical_alert TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'scheduled';

ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS metadata TEXT;

-- ─── 1. Wipe existing data ─────────────────────────────────────────────────
-- event_status_history & event_overrides reference events / profiles, so
-- wipe them first.
TRUNCATE TABLE event_status_history RESTART IDENTITY CASCADE;
TRUNCATE TABLE event_overrides      RESTART IDENTITY CASCADE;
TRUNCATE TABLE activity_logs        RESTART IDENTITY CASCADE;
TRUNCATE TABLE events               RESTART IDENTITY CASCADE;
TRUNCATE TABLE referrals            RESTART IDENTITY CASCADE;
DELETE FROM profiles;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. PROFILES — 52 accounts
-- ═══════════════════════════════════════════════════════════════════════════
-- Layout
--   1   System Admin                                          (dddd…)
--   2   Clinical Admins                                       (cccc…)
--   4   Professors (prof1…prof4)                              (2…5)
--  36   Advisee Clinicians (9 each × 4 professors)            (a/b/c/d…)
--   5   Special-state accounts (INACTIVE / LOCKED / counter)  (eeee…)
--   4   Unassigned clinicians (no advisers)                   (ffff…)
-- All passwords = 'password'.  System Admin sees this list under /system-admin/users.

INSERT INTO profiles (id, email, first_name, last_name, role, subrole, adviser_ids,
                      year_level, clinical_department, batch_name, password, status,
                      failed_login_attempts, avatar_url) VALUES
-- System Admin
('dddd0000-0000-0000-0000-000000000000','sysadmin@example.com','System','Administrator','system_admin',NULL,NULL,NULL,NULL,NULL,'password','ACTIVE',0,NULL),

-- Clinical Admins
('cccc0000-0000-0000-0000-000000000001','admin1@example.com','Clarisse','Domingo','clinical_admin','head',NULL,NULL,'OM','Staff 2025','password','ACTIVE',0,NULL),
('cccc0000-0000-0000-0000-000000000002','admin2@example.com','Renato','Villanueva','clinical_admin','assistant',NULL,NULL,'OP','Staff 2025','password','ACTIVE',0,NULL),

-- Professors
('22222222-2222-2222-2222-222222222222','prof1@example.com','Maria','Salazar','professor',NULL,NULL,NULL,'OM','Faculty','password','ACTIVE',0,NULL),
('33333333-3333-3333-3333-333333333333','prof2@example.com','Eduardo','Cruz','professor',NULL,NULL,NULL,'OP','Faculty','password','ACTIVE',0,NULL),
('44444444-4444-4444-4444-444444444444','prof3@example.com','Imelda','Pascual','professor',NULL,NULL,NULL,'Prostho','Faculty','password','ACTIVE',0,NULL),
('55555555-5555-5555-5555-555555555555','prof4@example.com','Roberto','Aquino','professor',NULL,NULL,NULL,'Ortho','Faculty','password','ACTIVE',0,NULL),

-- Prof Maria's 9 advisees (a-prefix UUIDs)
('aaaa0000-0000-0000-0000-000000000001','carlos@example.com','Carlos','Santos','clinician',NULL,ARRAY['22222222-2222-2222-2222-222222222222'],'4th yr','OM','Batch 2025','password','ACTIVE',0,NULL),
('aaaa0000-0000-0000-0000-000000000002','maria.c@example.com','Maria Clara','Reyes','clinician',NULL,ARRAY['22222222-2222-2222-2222-222222222222'],'5th yr','Prostho','Batch 2024','password','ACTIVE',0,NULL),
('aaaa0000-0000-0000-0000-000000000003','jose@example.com','Jose','Garcia','clinician',NULL,ARRAY['22222222-2222-2222-2222-222222222222'],'4th yr','OP','Batch 2025','password','ACTIVE',0,NULL),
('aaaa0000-0000-0000-0000-000000000004','liza@example.com','Liza','Bautista','clinician',NULL,ARRAY['22222222-2222-2222-2222-222222222222'],'4th yr','Ortho','Batch 2025','password','ACTIVE',0,NULL),
('aaaa0000-0000-0000-0000-000000000005','marco@example.com','Marco','Fernandez','clinician',NULL,ARRAY['22222222-2222-2222-2222-222222222222'],'5th yr','OM','Batch 2024','password','ACTIVE',1,NULL),
('aaaa0000-0000-0000-0000-000000000006','nina@example.com','Nina','Aurelio','clinician',NULL,ARRAY['22222222-2222-2222-2222-222222222222'],'4th yr','OP','Batch 2025','password','ACTIVE',0,NULL),
('aaaa0000-0000-0000-0000-000000000007','paulo@example.com','Paulo','Ramirez','clinician',NULL,ARRAY['22222222-2222-2222-2222-222222222222'],'5th yr','Prostho','Batch 2024','password','ACTIVE',0,NULL),
('aaaa0000-0000-0000-0000-000000000008','rica@example.com','Rica','Mendoza','clinician',NULL,ARRAY['22222222-2222-2222-2222-222222222222'],'3rd yr','OM','Batch 2026','password','ACTIVE',0,NULL),
('aaaa0000-0000-0000-0000-000000000009','tomas@example.com','Tomas','Lim','clinician',NULL,ARRAY['22222222-2222-2222-2222-222222222222'],'4th yr','Ortho','Batch 2025','password','ACTIVE',0,NULL),

-- Prof Eduardo's 9 advisees
('bbbb0000-0000-0000-0000-000000000001','anna@example.com','Anna','Mendoza','clinician',NULL,ARRAY['33333333-3333-3333-3333-333333333333'],'4th yr','OP','Batch 2025','password','ACTIVE',0,NULL),
('bbbb0000-0000-0000-0000-000000000002','miguel@example.com','Miguel','Tan','clinician',NULL,ARRAY['33333333-3333-3333-3333-333333333333'],'5th yr','OM','Batch 2024','password','ACTIVE',0,NULL),
('bbbb0000-0000-0000-0000-000000000003','sarah@example.com','Sarah','Lopez','clinician',NULL,ARRAY['33333333-3333-3333-3333-333333333333'],'4th yr','Prostho','Batch 2025','password','ACTIVE',2,NULL),
('bbbb0000-0000-0000-0000-000000000004','daniel@example.com','Daniel','Ocampo','clinician',NULL,ARRAY['33333333-3333-3333-3333-333333333333'],'3rd yr','OP','Batch 2026','password','ACTIVE',0,NULL),
('bbbb0000-0000-0000-0000-000000000005','elena@example.com','Elena','Vargas','clinician',NULL,ARRAY['33333333-3333-3333-3333-333333333333'],'4th yr','Ortho','Batch 2025','password','ACTIVE',0,NULL),
('bbbb0000-0000-0000-0000-000000000006','francis@example.com','Francis','Yu','clinician',NULL,ARRAY['33333333-3333-3333-3333-333333333333'],'5th yr','OM','Batch 2024','password','ACTIVE',0,NULL),
('bbbb0000-0000-0000-0000-000000000007','grace@example.com','Grace','Castillo','clinician',NULL,ARRAY['33333333-3333-3333-3333-333333333333'],'4th yr','OP','Batch 2025','password','ACTIVE',0,NULL),
('bbbb0000-0000-0000-0000-000000000008','hector@example.com','Hector','Navarro','clinician',NULL,ARRAY['33333333-3333-3333-3333-333333333333'],'5th yr','Prostho','Batch 2024','password','ACTIVE',0,NULL),
('bbbb0000-0000-0000-0000-000000000009','isabel@example.com','Isabel','Dela Rosa','clinician',NULL,ARRAY['33333333-3333-3333-3333-333333333333'],'4th yr','Ortho','Batch 2025','password','ACTIVE',0,NULL),

-- Prof Imelda's 9 advisees
('cafe0000-0000-0000-0000-000000000001','jenny@example.com','Jenny','Pineda','clinician',NULL,ARRAY['44444444-4444-4444-4444-444444444444'],'4th yr','Prostho','Batch 2025','password','ACTIVE',0,NULL),
('cafe0000-0000-0000-0000-000000000002','kevin@example.com','Kevin','Morales','clinician',NULL,ARRAY['44444444-4444-4444-4444-444444444444'],'5th yr','OP','Batch 2024','password','ACTIVE',0,NULL),
('cafe0000-0000-0000-0000-000000000003','lara@example.com','Lara','Sison','clinician',NULL,ARRAY['44444444-4444-4444-4444-444444444444'],'4th yr','OM','Batch 2025','password','ACTIVE',0,NULL),
('cafe0000-0000-0000-0000-000000000004','mark@example.com','Mark','Tolentino','clinician',NULL,ARRAY['44444444-4444-4444-4444-444444444444'],'3rd yr','Ortho','Batch 2026','password','ACTIVE',0,NULL),
('cafe0000-0000-0000-0000-000000000005','olivia@example.com','Olivia','Salonga','clinician',NULL,ARRAY['44444444-4444-4444-4444-444444444444'],'5th yr','Prostho','Batch 2024','password','ACTIVE',0,NULL),
('cafe0000-0000-0000-0000-000000000006','patrick@example.com','Patrick','Gomez','clinician',NULL,ARRAY['44444444-4444-4444-4444-444444444444'],'4th yr','OP','Batch 2025','password','ACTIVE',0,NULL),
('cafe0000-0000-0000-0000-000000000007','queenie@example.com','Queenie','Velasco','clinician',NULL,ARRAY['44444444-4444-4444-4444-444444444444'],'4th yr','OM','Batch 2025','password','ACTIVE',0,NULL),
('cafe0000-0000-0000-0000-000000000008','ramon@example.com','Ramon','Cabrera','clinician',NULL,ARRAY['44444444-4444-4444-4444-444444444444'],'5th yr','Ortho','Batch 2024','password','ACTIVE',0,NULL),
('cafe0000-0000-0000-0000-000000000009','sofia@example.com','Sofia','Robles','clinician',NULL,ARRAY['44444444-4444-4444-4444-444444444444'],'4th yr','Prostho','Batch 2025','password','ACTIVE',0,NULL),

-- Prof Roberto's 9 advisees
('dcba0000-0000-0000-0000-000000000001','tristan@example.com','Tristan','Buenaventura','clinician',NULL,ARRAY['55555555-5555-5555-5555-555555555555'],'4th yr','Ortho','Batch 2025','password','ACTIVE',0,NULL),
('dcba0000-0000-0000-0000-000000000002','ursula@example.com','Ursula','Magsaysay','clinician',NULL,ARRAY['55555555-5555-5555-5555-555555555555'],'5th yr','OM','Batch 2024','password','ACTIVE',0,NULL),
('dcba0000-0000-0000-0000-000000000003','victor@example.com','Victor','Padilla','clinician',NULL,ARRAY['55555555-5555-5555-5555-555555555555'],'4th yr','OP','Batch 2025','password','ACTIVE',0,NULL),
('dcba0000-0000-0000-0000-000000000004','wendy@example.com','Wendy','Trinidad','clinician',NULL,ARRAY['55555555-5555-5555-5555-555555555555'],'5th yr','Prostho','Batch 2024','password','ACTIVE',0,NULL),
('dcba0000-0000-0000-0000-000000000005','xavier@example.com','Xavier','Madrigal','clinician',NULL,ARRAY['55555555-5555-5555-5555-555555555555'],'3rd yr','OM','Batch 2026','password','ACTIVE',0,NULL),
('dcba0000-0000-0000-0000-000000000006','yara@example.com','Yara','Domingo','clinician',NULL,ARRAY['55555555-5555-5555-5555-555555555555'],'4th yr','Ortho','Batch 2025','password','ACTIVE',0,NULL),
('dcba0000-0000-0000-0000-000000000007','zach@example.com','Zach','Ilagan','clinician',NULL,ARRAY['55555555-5555-5555-5555-555555555555'],'5th yr','OP','Batch 2024','password','ACTIVE',0,NULL),
('dcba0000-0000-0000-0000-000000000008','aida@example.com','Aida','Bonifacio','clinician',NULL,ARRAY['55555555-5555-5555-5555-555555555555'],'4th yr','OM','Batch 2025','password','ACTIVE',0,NULL),
('dcba0000-0000-0000-0000-000000000009','bernie@example.com','Bernie','Quirino','clinician',NULL,ARRAY['55555555-5555-5555-5555-555555555555'],'4th yr','Prostho','Batch 2025','password','ACTIVE',0,NULL),

-- Special state accounts
('eeee0000-0000-0000-0000-000000000005','newprof@example.com','Nestor','Galvez','professor',NULL,NULL,NULL,'OM','Faculty','password','INACTIVE',0,NULL),

-- Unassigned (no advisers) clinicians — useful for "no scope" tests
('ffff0000-0000-0000-0000-000000000001','test@example.com','Test','User','clinician',NULL,NULL,'5th yr','Prostho','Batch 2024','password','ACTIVE',0,NULL),
('ffff0000-0000-0000-0000-000000000002','juan@example.com','Juan','Dela Cruz','clinician',NULL,NULL,'4th yr','Ortho','Batch 2025','password','ACTIVE',0,NULL),
('ffff0000-0000-0000-0000-000000000003','blanca@example.com','Blanca','Villareal','clinician',NULL,NULL,'5th yr','OM','Batch 2024','password','ACTIVE',0,NULL),
('ffff0000-0000-0000-0000-000000000004','noel@example.com','Noel','Pineda','clinician',NULL,NULL,'3rd yr','OP','Batch 2026','password','ACTIVE',0,NULL);

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. REFERRALS — 110 rows
-- ═══════════════════════════════════════════════════════════════════════════
-- Strategy: a DO block iterates a curated array of templates. Templates rotate
-- creator/acceptor pairs (creator ≠ acceptor), sections, treatments, statuses
-- and request states so every UI filter has data to display.
-- ═══════════════════════════════════════════════════════════════════════════

DO $seed_referrals$
DECLARE
  v_creators UUID[] := ARRAY[
    'aaaa0000-0000-0000-0000-000000000001'::uuid,'aaaa0000-0000-0000-0000-000000000002'::uuid,
    'aaaa0000-0000-0000-0000-000000000003'::uuid,'aaaa0000-0000-0000-0000-000000000004'::uuid,
    'aaaa0000-0000-0000-0000-000000000005'::uuid,'aaaa0000-0000-0000-0000-000000000006'::uuid,
    'aaaa0000-0000-0000-0000-000000000007'::uuid,'aaaa0000-0000-0000-0000-000000000008'::uuid,
    'aaaa0000-0000-0000-0000-000000000009'::uuid,
    'bbbb0000-0000-0000-0000-000000000001'::uuid,'bbbb0000-0000-0000-0000-000000000002'::uuid,
    'bbbb0000-0000-0000-0000-000000000003'::uuid,'bbbb0000-0000-0000-0000-000000000004'::uuid,
    'bbbb0000-0000-0000-0000-000000000005'::uuid,'bbbb0000-0000-0000-0000-000000000006'::uuid,
    'bbbb0000-0000-0000-0000-000000000007'::uuid,'bbbb0000-0000-0000-0000-000000000008'::uuid,
    'bbbb0000-0000-0000-0000-000000000009'::uuid,
    'cafe0000-0000-0000-0000-000000000001'::uuid,'cafe0000-0000-0000-0000-000000000002'::uuid,
    'cafe0000-0000-0000-0000-000000000003'::uuid,'cafe0000-0000-0000-0000-000000000004'::uuid,
    'cafe0000-0000-0000-0000-000000000005'::uuid,'cafe0000-0000-0000-0000-000000000006'::uuid,
    'cafe0000-0000-0000-0000-000000000007'::uuid,'cafe0000-0000-0000-0000-000000000008'::uuid,
    'cafe0000-0000-0000-0000-000000000009'::uuid,
    'dcba0000-0000-0000-0000-000000000001'::uuid,'dcba0000-0000-0000-0000-000000000002'::uuid,
    'dcba0000-0000-0000-0000-000000000003'::uuid,'dcba0000-0000-0000-0000-000000000004'::uuid,
    'dcba0000-0000-0000-0000-000000000005'::uuid,'dcba0000-0000-0000-0000-000000000006'::uuid,
    'dcba0000-0000-0000-0000-000000000007'::uuid,'dcba0000-0000-0000-0000-000000000008'::uuid,
    'dcba0000-0000-0000-0000-000000000009'::uuid,
    'ffff0000-0000-0000-0000-000000000001'::uuid,'ffff0000-0000-0000-0000-000000000002'::uuid,
    'ffff0000-0000-0000-0000-000000000003'::uuid,'ffff0000-0000-0000-0000-000000000004'::uuid
  ];

  -- (section, discipline, treatment_service, treatment_label) tuples
  v_dest TEXT[][] := ARRAY[
    ['OM','Oral Surgery','Extraction','Extraction'],
    ['OM','Oral Surgery','Flap Surgery','Flap Surgery'],
    ['OM','Oral Surgery','Odontectomy','Odontectomy'],
    ['OM','Endodontics','Root Canal Treatment','Root Canal Treatment'],
    ['OM','Periodontics','Scaling & Polishing','Scaling & Polishing'],
    ['OM','Periodontics','Non-Surgical Root Planing','Non-Surgical Root Planing'],
    ['OM','Oral Diagnosis','Special Case','Oral Cancer Screening'],
    ['OP','Restorative Dentistry','Composite Restoration','Composite Restoration'],
    ['OP','Restorative Dentistry','Glass Ionomer Restoration','Glass Ionomer Restoration'],
    ['OP','Restorative Dentistry','Pit & Fissure Sealant','Pit & Fissure Sealant'],
    ['OP','Restorative Dentistry','Direct Onlay','Direct Onlay'],
    ['OP','Fixed Partial Dentures','Crown','Crown'],
    ['OP','Fixed Partial Dentures','Bridge','Bridge'],
    ['OP','Fixed Partial Dentures','Post & Core Crown','Post & Core Crown'],
    ['OP','Pediatric Dentistry','Pedo Restoration','Pedo Restoration'],
    ['OP','Pediatric Dentistry','Pedo Pulp Therapy','Pedo Pulp Therapy'],
    ['OP','Pediatric Dentistry','Space Maintainer','Space Maintainer'],
    ['OP','Undergraduate Orthodontics','Preventive Orthodontics','Preventive Orthodontics'],
    ['OP','Undergraduate Orthodontics','Interceptive Orthodontics','Interceptive Orthodontics'],
    ['Prostho','Prosthodontics','Removable Partial Dentures - Removable Partial Dentures','Removable Partial Dentures'],
    ['Prostho','Prosthodontics','Complete Dentures','Complete Dentures'],
    ['Ortho','Corrective Orthodontics','Corrective Orthodontics','Corrective Orthodontics']
  ];
  v_origins TEXT[][] := ARRAY[
    ['OM','Oral Diagnosis','Oral Diagnosis'],
    ['OP','Restorative Dentistry','Composite Restoration'],
    ['Prostho','Prosthodontics','Complete Dentures'],
    ['Ortho','Corrective Orthodontics','Corrective Orthodontics'],
    ['OM','Periodontics','Scaling & Polishing']
  ];
  v_alerts TEXT[] := ARRAY['None','Hypertension','Diabetes','Asthma','Heart Condition','Epilepsy','Pregnancy','Allergy: Penicillin','None','None'];
  v_specials TEXT[] := ARRAY[NULL,NULL,NULL,'PWD','Senior Citizen','Pediatric','Medically Compromised',NULL,NULL,'High Risk'];
  v_sex TEXT[] := ARRAY['Male','Female'];
  v_history TEXT[] := ARRAY[
    'No significant medical history. Patient reports good general health.',
    'On maintenance medication for hypertension (Losartan 50mg OD).',
    'Type 2 Diabetes, HbA1c 7.1, on Metformin.',
    'Asthma — uses Salbutamol inhaler PRN. No recent exacerbations.',
    'Allergic to penicillin. Tolerates clindamycin well.',
    'Mild seasonal allergies; no chronic conditions.',
    'Pregnant — 2nd trimester. OB cleared for dental treatment.',
    'Cardiac stent placed 2023. On aspirin 81mg.',
    'No medications. Anxious during dental procedures.',
    'Hyperthyroid — currently controlled on methimazole.'
  ];
  v_notes TEXT[] := ARRAY[
    'Refer for evaluation and management. Patient cooperative.',
    'Pre-operative clearance from physician attached.',
    'Follow-up after restorative treatment in OP section.',
    'Endorsed for cross-section management. Tooth #36.',
    'Patient prefers afternoon appointments.',
    'Re-evaluate after 2 weeks of antibiotic coverage.',
    'Coordinate with prosthetic plan after extraction.',
    'Urgent — patient in pain, needs prompt scheduling.',
    'Routine referral. No special precautions.',
    'Behavior management may be needed (pediatric).'
  ];
  v_statuses TEXT[] := ARRAY['ongoing','completed','deferred','blacklisted'];

  i INT;
  v_creator UUID; v_acceptor UUID;
  v_dest_row TEXT[]; v_orig_row TEXT[];
  v_chart TEXT;
  v_year INT;
  v_created TIMESTAMPTZ;
  v_accepted TIMESTAMPTZ;
  v_status_changed TIMESTAMPTZ;
  v_referral_status TEXT;
  v_is_accepted BOOLEAN;
  v_acceptor_name TEXT;
  v_age INT;
  v_alert TEXT;
  v_special TEXT;
  v_sex_v TEXT;
  v_history_v TEXT;
  v_notes_v TEXT;
  v_edit_status TEXT; v_edit_reason TEXT; v_edit_decline TEXT;
  v_rerefer_status TEXT; v_rerefer_reason TEXT;
  v_deletion_status TEXT; v_deletion_reason TEXT; v_deletion_decline TEXT;
  v_creator_adviser UUID;
BEGIN
  FOR i IN 1..110 LOOP
    v_creator   := v_creators[((i - 1) % array_length(v_creators,1)) + 1];
    -- pick acceptor: shift index so acceptor ≠ creator
    v_acceptor  := v_creators[(((i + 7) % array_length(v_creators,1))) + 1];
    IF v_acceptor = v_creator THEN
      v_acceptor := v_creators[(((i + 11) % array_length(v_creators,1))) + 1];
    END IF;

    v_dest_row := ARRAY[
      v_dest[((i - 1) % array_length(v_dest,1)) + 1][1],
      v_dest[((i - 1) % array_length(v_dest,1)) + 1][2],
      v_dest[((i - 1) % array_length(v_dest,1)) + 1][3],
      v_dest[((i - 1) % array_length(v_dest,1)) + 1][4]
    ];
    v_orig_row := ARRAY[
      v_origins[((i - 1) % array_length(v_origins,1)) + 1][1],
      v_origins[((i - 1) % array_length(v_origins,1)) + 1][2],
      v_origins[((i - 1) % array_length(v_origins,1)) + 1][3]
    ];

    -- spread creation dates Nov 2025 → May 2026
    v_year    := 2025 + ((i + 4) / 12);  -- mostly 2026
    v_created := TIMESTAMPTZ '2025-11-01 08:00:00+00' + ((i * 47) || ' hours')::interval;
    v_chart   := to_char(extract(year from v_created), 'FM0000') || '-' || to_char(i, 'FM00000');

    v_age     := 6 + (i * 7) % 70;
    v_alert   := v_alerts[((i - 1) % array_length(v_alerts,1)) + 1];
    v_special := v_specials[((i - 1) % array_length(v_specials,1)) + 1];
    v_sex_v   := v_sex[((i - 1) % 2) + 1];
    v_history_v := v_history[((i - 1) % array_length(v_history,1)) + 1];
    v_notes_v   := v_notes[((i - 1) % array_length(v_notes,1)) + 1];

    -- 1 in 5 stays unaccepted (PENDING) so the Available filter has data
    v_is_accepted := (i % 5) <> 0;
    IF v_is_accepted THEN
      v_accepted := v_created + interval '2 days' + ((i % 6) || ' hours')::interval;
      v_referral_status := v_statuses[((i - 1) % 4) + 1];
      IF v_referral_status <> 'ongoing' THEN
        v_status_changed := v_accepted + interval '10 days';
      ELSE
        v_status_changed := NULL;
      END IF;
      SELECT first_name || ' ' || last_name INTO v_acceptor_name FROM profiles WHERE id = v_acceptor;
    ELSE
      v_accepted := NULL;
      v_referral_status := 'ongoing';
      v_status_changed := NULL;
      v_acceptor_name := 'None';
    END IF;

    -- Edit / Re-refer / Deletion request variations (sprinkled across rows)
    v_edit_status := NULL; v_edit_reason := NULL; v_edit_decline := NULL;
    v_rerefer_status := NULL; v_rerefer_reason := NULL;
    v_deletion_status := NULL; v_deletion_reason := NULL; v_deletion_decline := NULL;

    IF v_is_accepted THEN
      CASE i % 13
        WHEN 1 THEN
          v_edit_status := 'pending';
          v_edit_reason := 'Need to update tentative appointment schedule and treatment plan.';
        WHEN 2 THEN
          v_edit_status := 'approved';
          v_edit_reason := 'Patient requested earlier schedule.';
        WHEN 3 THEN
          v_edit_status := 'declined';
          v_edit_reason := 'Wrong tooth number recorded.';
          v_edit_decline := 'Insufficient justification — please re-submit with photo.';
        WHEN 4 THEN
          v_rerefer_status := 'pending';
          v_rerefer_reason := 'Acceptor unavailable due to clinic schedule conflict.';
        WHEN 5 THEN
          v_rerefer_status := 'approved';
          v_rerefer_reason := 'Patient relocated to a partner clinic.';
        WHEN 6 THEN
          v_rerefer_status := 'declined';
          v_rerefer_reason := 'Personal reason cited.';
        WHEN 7 THEN
          v_deletion_status := 'pending';
          v_deletion_reason := 'Duplicate referral created in error.';
        WHEN 8 THEN
          v_deletion_status := 'declined';
          v_deletion_reason := 'Patient withdrew but record needed.';
          v_deletion_decline := 'Keep record for audit; mark as Blacklisted instead.';
        ELSE
          -- no request
      END CASE;
    END IF;

    SELECT adviser_ids[1] INTO v_creator_adviser FROM profiles WHERE id = v_creator;

    INSERT INTO referrals (
      user_id, chart_number, treatment, age, sex, medical_alert,
      clinical_section_origin, clinical_discipline_origin, treatment_service_origin,
      clinical_section_destination, clinical_discipline_destination, treatment_service_destination,
      special_case, medical_history, tentative_appointment_schedule, notes_and_special_indications,
      status, accepted_by, accepted_by_user_id, accepted_at,
      referral_status, referral_status_changed_at, is_featured,
      edit_request_reason, edit_request_status, edit_request_decline_reason, edit_request_professor_ids,
      rerefer_request_reason, rerefer_request_status, rerefer_request_professor_ids,
      rerefer_requested_by, rerefer_requested_at,
      deletion_request_reason, deletion_request_status, deletion_request_decline_reason, deletion_request_professor_ids,
      deletion_requested_by, deletion_requested_at,
      last_edited_by, last_edited_at,
      created_at, updated_at
    ) VALUES (
      v_creator, v_chart, v_dest_row[4], v_age, v_sex_v, v_alert,
      v_orig_row[1], v_orig_row[2], v_orig_row[3],
      v_dest_row[1], v_dest_row[2], v_dest_row[3],
      v_special, v_history_v, v_created + interval '14 days', v_notes_v,
      CASE WHEN v_is_accepted THEN 'approved' ELSE 'pending' END,
      v_acceptor_name,
      CASE WHEN v_is_accepted THEN v_acceptor ELSE NULL END,
      v_accepted,
      v_referral_status, v_status_changed, v_is_accepted,
      v_edit_reason, v_edit_status, v_edit_decline,
        CASE WHEN v_edit_status IS NOT NULL AND v_creator_adviser IS NOT NULL THEN ARRAY[v_creator_adviser] ELSE NULL END,
      v_rerefer_reason, v_rerefer_status,
        CASE WHEN v_rerefer_status IS NOT NULL AND v_creator_adviser IS NOT NULL THEN ARRAY[v_creator_adviser] ELSE NULL END,
      CASE WHEN v_rerefer_status IS NOT NULL THEN v_creator ELSE NULL END,
      CASE WHEN v_rerefer_status IS NOT NULL THEN v_created + interval '5 days' ELSE NULL END,
      v_deletion_reason, v_deletion_status, v_deletion_decline,
        CASE WHEN v_deletion_status IS NOT NULL AND v_creator_adviser IS NOT NULL THEN ARRAY[v_creator_adviser] ELSE NULL END,
      CASE WHEN v_deletion_status IS NOT NULL THEN v_creator ELSE NULL END,
      CASE WHEN v_deletion_status IS NOT NULL THEN v_created + interval '6 days' ELSE NULL END,
      CASE WHEN v_edit_status = 'approved' THEN v_acceptor_name ELSE NULL END,
      CASE WHEN v_edit_status = 'approved' THEN v_created + interval '8 days' ELSE NULL END,
      v_created, v_created
    );
  END LOOP;
END;
$seed_referrals$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. EVENTS — 110 rows
-- ═══════════════════════════════════════════════════════════════════════════
DO $seed_events$
DECLARE
  v_users UUID[] := ARRAY[
    'aaaa0000-0000-0000-0000-000000000001'::uuid,'aaaa0000-0000-0000-0000-000000000002'::uuid,
    'aaaa0000-0000-0000-0000-000000000003'::uuid,'aaaa0000-0000-0000-0000-000000000004'::uuid,
    'bbbb0000-0000-0000-0000-000000000001'::uuid,'bbbb0000-0000-0000-0000-000000000002'::uuid,
    'bbbb0000-0000-0000-0000-000000000003'::uuid,'cafe0000-0000-0000-0000-000000000001'::uuid,
    'cafe0000-0000-0000-0000-000000000002'::uuid,'dcba0000-0000-0000-0000-000000000001'::uuid,
    'dcba0000-0000-0000-0000-000000000002'::uuid,'22222222-2222-2222-2222-222222222222'::uuid,
    'ffff0000-0000-0000-0000-000000000001'::uuid
  ];
  v_colors TEXT[] := ARRAY['#EF4444','#EC4899','#F97316','#EAB308','#22C55E','#14B8A6','#0EA5E9','#A855F7','#374151'];
  v_titles TEXT[] := ARRAY[
    'Patient Consultation','Operative Restoration','Endodontic Therapy','Periodontal Scaling',
    'Prosthodontic Fitting','Orthodontic Adjustment','Pediatric Recall','Oral Surgery — Extraction',
    'Crown Cementation','Bridge Try-In','Denture Adjustment','Post-Op Check',
    'Faculty Meeting','Case Presentation','Research Discussion'
  ];
  v_locations TEXT[] := ARRAY['Clinic Room 1','Clinic Room 2','OM Bay 3','OP Bay 4','Prostho Bay 1','Ortho Bay 2','Conference Room A','Skills Lab'];
  v_patients TEXT[] := ARRAY[
    'Maria L. Santos','John P. Rivera','Carla M. Reyes','Pedro A. Cruz','Angelica D. Lim',
    'Ramon B. Tan','Sofia E. Garcia','Diego F. Mendoza','Beatrice G. Ocampo','Hector V. Yu',
    NULL,NULL,'Group Session — N/A'
  ];
  v_alerts TEXT[] := ARRAY['None','Hypertension','Diabetes','Asthma','Allergy: Latex','None','None'];
  v_notes TEXT[] := ARRAY[
    '<p><strong>Pre-op:</strong> Confirm vitals.</p><ul><li>Bring radiograph</li><li>Verify consent form</li></ul>',
    '<p>Routine restoration. <em>Use rubber dam.</em></p>',
    '<p><strong>RCT</strong> session 2 of 3. Working length confirmed.</p>',
    '<p>Scaling — quadrant <u>UR</u>. Recall in 6 months.</p>',
    '<p>Final impression for RPD. <em>Verify occlusion.</em></p>',
    '<p>Wire change. <strong>Check elastics.</strong></p>',
    '<p>Pediatric recall — fluoride application. <em>Use Tell-Show-Do.</em></p>',
    '<p>Surgical extraction #38. <strong>Pre-med:</strong> amoxicillin 500 mg.</p>',
    '<p>Cementation — verify shade match. <ol><li>Try-in</li><li>Adjust</li><li>Cement</li></ol></p>',
    '<p>Discuss case findings with attending professor.</p>'
  ];

  i INT;
  v_uid UUID; v_color TEXT; v_title TEXT; v_loc TEXT; v_patient TEXT; v_alert TEXT; v_note TEXT;
  v_start TIMESTAMPTZ; v_end TIMESTAMPTZ;
  v_day INT; v_hour INT;
BEGIN
  FOR i IN 1..110 LOOP
    v_uid     := v_users[((i - 1) % array_length(v_users,1)) + 1];
    v_color   := v_colors[((i - 1) % array_length(v_colors,1)) + 1];
    v_title   := v_titles[((i - 1) % array_length(v_titles,1)) + 1];
    v_loc     := v_locations[((i - 1) % array_length(v_locations,1)) + 1];
    v_patient := v_patients[((i - 1) % array_length(v_patients,1)) + 1];
    v_alert   := v_alerts[((i - 1) % array_length(v_alerts,1)) + 1];
    v_note    := v_notes[((i - 1) % array_length(v_notes,1)) + 1];

    -- Spread events across 8 weeks: Apr 27 2026 → Jun 22 2026, weekdays 7AM–5PM
    v_day  := (i - 1) % 56;
    v_hour := 7 + ((i * 3) % 10);
    v_start := TIMESTAMPTZ '2026-04-27 00:00:00+00' + (v_day || ' days')::interval + (v_hour || ' hours')::interval;
    -- duration 1–2 hours
    v_end   := v_start + ((1 + (i % 2)) || ' hours')::interval;

    INSERT INTO events (user_id, title, description, start_time, end_time,
                        location, patient_name, color, notes, medical_alert,
                        is_favorite, status, created_at, updated_at)
    VALUES (v_uid, v_title, 'Auto-generated test event #' || i, v_start, v_end,
            v_loc, v_patient, v_color, v_note, v_alert,
            (i % 7 = 0), CASE WHEN i % 17 = 0 THEN 'cancelled' ELSE 'scheduled' END,
            v_start - interval '3 days', v_start - interval '3 days');
  END LOOP;

  -- Two intentionally overlapping events on the same slot for one user (UI test)
  INSERT INTO events (user_id, title, description, start_time, end_time, location, patient_name, color, notes, medical_alert)
  VALUES
    ('aaaa0000-0000-0000-0000-000000000001','Overlap A','Overlap test A','2026-05-04 10:00:00+00','2026-05-04 11:00:00+00','Clinic Room 1','Patient A','#EF4444','<p>Overlap A</p>','None'),
    ('aaaa0000-0000-0000-0000-000000000001','Overlap B','Overlap test B','2026-05-04 10:30:00+00','2026-05-04 11:30:00+00','Clinic Room 1','Patient B','#22C55E','<p>Overlap B</p>','Hypertension');
END;
$seed_events$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. ACTIVITY LOGS — generated from referrals + manual auth/profile events
-- ═══════════════════════════════════════════════════════════════════════════
DO $seed_logs$
DECLARE r RECORD; v_acceptor_name TEXT;
BEGIN
  -- CREATE_REFERRAL — one log per referral
  FOR r IN SELECT id, user_id, chart_number, created_at FROM referrals LOOP
    INSERT INTO activity_logs (user_id, action, description, metadata, created_at)
    VALUES (r.user_id, 'CREATE_REFERRAL',
            'YOU CREATED A REFERRAL - Chart: ' || r.chart_number,
            jsonb_build_object('referral_id', r.id, 'chart_number', r.chart_number)::text,
            r.created_at);
  END LOOP;

  -- ACCEPT_REFERRAL
  FOR r IN SELECT id, user_id, accepted_by_user_id, accepted_by, chart_number, accepted_at
           FROM referrals WHERE accepted_by_user_id IS NOT NULL LOOP
    INSERT INTO activity_logs (user_id, action, description, metadata, created_at)
    VALUES (r.accepted_by_user_id, 'ACCEPT_REFERRAL',
            'YOU HAVE ACCEPTED A REFERRAL - Chart: ' || r.chart_number,
            jsonb_build_object('referral_id', r.id, 'chart_number', r.chart_number, 'creator_id', r.user_id)::text,
            r.accepted_at);
    -- mirror to creator
    INSERT INTO activity_logs (user_id, action, description, metadata, created_at)
    VALUES (r.user_id, 'ACCEPT_REFERRAL',
            'YOUR REFERRAL WAS ACCEPTED BY ' || r.accepted_by || ' - Chart: ' || r.chart_number,
            jsonb_build_object('referral_id', r.id, 'chart_number', r.chart_number, 'accepted_by_user_id', r.accepted_by_user_id)::text,
            r.accepted_at);
  END LOOP;

  -- CHANGE_REFERRAL_STATUS for non-ongoing
  FOR r IN SELECT id, accepted_by_user_id, chart_number, referral_status, referral_status_changed_at
           FROM referrals
           WHERE referral_status_changed_at IS NOT NULL AND accepted_by_user_id IS NOT NULL LOOP
    INSERT INTO activity_logs (user_id, action, description, metadata, created_at)
    VALUES (r.accepted_by_user_id, 'CHANGE_REFERRAL_STATUS',
            'YOU CHANGED REFERRAL STATUS TO ' || upper(r.referral_status) || ' - Chart: ' || r.chart_number,
            jsonb_build_object('referral_id', r.id, 'chart_number', r.chart_number, 'new_status', r.referral_status)::text,
            r.referral_status_changed_at);
  END LOOP;

  -- SUBMIT_EDIT_REQUEST + APPROVE/DECLINE
  FOR r IN SELECT id, user_id, chart_number, edit_request_status, edit_request_reason, last_edited_at, created_at
           FROM referrals WHERE edit_request_status IS NOT NULL LOOP
    INSERT INTO activity_logs (user_id, action, description, metadata, created_at)
    VALUES (r.user_id, 'SUBMIT_EDIT_REQUEST',
            'EDIT REQUEST SUBMITTED - Chart: ' || r.chart_number || ', Reason: ' || r.edit_request_reason,
            jsonb_build_object('referral_id', r.id, 'reason', r.edit_request_reason)::text,
            r.created_at + interval '3 days');
    IF r.edit_request_status = 'approved' THEN
      INSERT INTO activity_logs (user_id, action, description, metadata, created_at)
      VALUES (r.user_id, 'APPROVE_EDIT_REQUEST',
              'YOUR EDIT REQUEST WAS APPROVED - Chart: ' || r.chart_number,
              jsonb_build_object('referral_id', r.id, 'chart_number', r.chart_number)::text,
              COALESCE(r.last_edited_at, r.created_at + interval '5 days'));
    ELSIF r.edit_request_status = 'declined' THEN
      INSERT INTO activity_logs (user_id, action, description, metadata, created_at)
      VALUES (r.user_id, 'DECLINE_EDIT_REQUEST',
              'YOUR EDIT REQUEST WAS DECLINED - Chart: ' || r.chart_number,
              jsonb_build_object('referral_id', r.id, 'chart_number', r.chart_number)::text,
              r.created_at + interval '5 days');
    END IF;
  END LOOP;

  -- REREFER_REQUEST + APPROVE/DECLINE
  FOR r IN SELECT id, user_id, chart_number, rerefer_request_status, rerefer_request_reason, rerefer_requested_at, created_at
           FROM referrals WHERE rerefer_request_status IS NOT NULL LOOP
    INSERT INTO activity_logs (user_id, action, description, metadata, created_at)
    VALUES (r.user_id, 'REREFER_REQUEST',
            'RE-REFERRAL REQUEST SUBMITTED - Chart: ' || r.chart_number || ', Reason: ' || r.rerefer_request_reason,
            jsonb_build_object('referral_id', r.id, 'reason', r.rerefer_request_reason)::text,
            COALESCE(r.rerefer_requested_at, r.created_at + interval '4 days'));
    IF r.rerefer_request_status = 'approved' THEN
      INSERT INTO activity_logs (user_id, action, description, metadata, created_at)
      VALUES (r.user_id, 'APPROVE_REREFER_REQUEST',
              'YOUR RE-REFERRAL REQUEST WAS APPROVED - Chart: ' || r.chart_number,
              jsonb_build_object('referral_id', r.id)::text,
              COALESCE(r.rerefer_requested_at, r.created_at) + interval '2 days');
    ELSIF r.rerefer_request_status = 'declined' THEN
      INSERT INTO activity_logs (user_id, action, description, metadata, created_at)
      VALUES (r.user_id, 'DECLINE_REREFER_REQUEST',
              'YOUR RE-REFERRAL REQUEST WAS DECLINED - Chart: ' || r.chart_number,
              jsonb_build_object('referral_id', r.id)::text,
              COALESCE(r.rerefer_requested_at, r.created_at) + interval '2 days');
    END IF;
  END LOOP;

  -- DELETION_REQUEST + DECLINE
  FOR r IN SELECT id, user_id, chart_number, deletion_request_status, deletion_request_reason, deletion_requested_at, created_at
           FROM referrals WHERE deletion_request_status IS NOT NULL LOOP
    INSERT INTO activity_logs (user_id, action, description, metadata, created_at)
    VALUES (r.user_id, 'DELETION_REQUEST',
            'DELETION REQUEST SUBMITTED - Chart: ' || r.chart_number || ', Reason: ' || r.deletion_request_reason,
            jsonb_build_object('referral_id', r.id, 'reason', r.deletion_request_reason)::text,
            COALESCE(r.deletion_requested_at, r.created_at + interval '6 days'));
    IF r.deletion_request_status = 'declined' THEN
      INSERT INTO activity_logs (user_id, action, description, metadata, created_at)
      VALUES (r.user_id, 'DECLINE_DELETION_REQUEST',
              'YOUR DELETION REQUEST WAS DECLINED - Chart: ' || r.chart_number,
              jsonb_build_object('referral_id', r.id)::text,
              COALESCE(r.deletion_requested_at, r.created_at) + interval '2 days');
    END IF;
  END LOOP;
END;
$seed_logs$;

-- Manual auth / profile / system-admin activity logs (login, lockout, profile edits, etc.)
INSERT INTO activity_logs (user_id, action, description, metadata, created_at) VALUES
('aaaa0000-0000-0000-0000-000000000001','LOGIN','Successful login from web client.','{"ip":"127.0.0.1"}','2026-05-01 08:01:00+00'),
('aaaa0000-0000-0000-0000-000000000002','LOGIN','Successful login from web client.','{"ip":"127.0.0.1"}','2026-05-01 08:05:00+00'),
('aaaa0000-0000-0000-0000-000000000001','LOGOUT','User logged out.',NULL,'2026-05-01 17:30:00+00'),
('eeee0000-0000-0000-0000-000000000001','LOGIN_FAILED','Wrong password (attempt 1/5).','{"reason":"bad_password"}','2026-04-29 09:00:00+00'),
('eeee0000-0000-0000-0000-000000000001','LOGIN_FAILED','Wrong password (attempt 2/5).','{"reason":"bad_password"}','2026-04-29 09:01:00+00'),
('eeee0000-0000-0000-0000-000000000001','LOGIN_FAILED','Wrong password (attempt 3/5).','{"reason":"bad_password"}','2026-04-29 09:02:00+00'),
('eeee0000-0000-0000-0000-000000000001','LOGIN_FAILED','Wrong password (attempt 4/5).','{"reason":"bad_password"}','2026-04-29 09:03:00+00'),
('eeee0000-0000-0000-0000-000000000001','ACCOUNT_LOCKED','Account auto-locked after 5 failed attempts.','{"threshold":5}','2026-04-29 09:04:00+00'),
('dddd0000-0000-0000-0000-000000000000','UPDATE_USER_STATUS','System Admin set status to LOCKED for locked@example.com.','{"target":"eeee0000-0000-0000-0000-000000000001","status":"LOCKED"}','2026-04-29 09:10:00+00'),
('dddd0000-0000-0000-0000-000000000000','CREATE_USER','System Admin created account newprof@example.com (professor, INACTIVE).','{"target":"eeee0000-0000-0000-0000-000000000005"}','2026-04-15 10:00:00+00'),
('dddd0000-0000-0000-0000-000000000000','RESET_PASSWORD','System Admin reset password for sarah@example.com.','{"target":"bbbb0000-0000-0000-0000-000000000003"}','2026-04-22 14:00:00+00'),
('aaaa0000-0000-0000-0000-000000000002','UPDATE_PROFILE','Profile updated: avatar + clinical_department.','{"fields":["avatar_url","clinical_department"]}','2026-04-30 11:00:00+00'),
('22222222-2222-2222-2222-222222222222','LOGIN','Professor login.',NULL,'2026-05-01 07:45:00+00'),
('22222222-2222-2222-2222-222222222222','VIEW_DASHBOARD','Opened Professor Analytics Dashboard.','{"period":"30d"}','2026-05-01 07:50:00+00'),
('cccc0000-0000-0000-0000-000000000001','LOGIN','Clinical Admin login.',NULL,'2026-05-01 08:00:00+00'),
('cccc0000-0000-0000-0000-000000000001','VIEW_DASHBOARD','Opened Clinical Admin Dashboard.','{"period":"7d"}','2026-05-01 08:02:00+00'),
('aaaa0000-0000-0000-0000-000000000003','CREATE_EVENT','Created event "Operative Restoration" on 2026-05-02.','{"color":"#EC4899"}','2026-04-29 16:00:00+00'),
('aaaa0000-0000-0000-0000-000000000003','UPDATE_EVENT','Edited event notes and patient name.',NULL,'2026-04-30 09:30:00+00'),
('aaaa0000-0000-0000-0000-000000000003','DELETE_EVENT','Deleted event scheduled for 2026-05-05.',NULL,'2026-05-01 10:00:00+00');

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. EVENT OVERRIDES & STATUS HISTORY
-- ═══════════════════════════════════════════════════════════════════════════
-- Small sample so professor view (color override / favorite) and status
-- audit history both have something to render.
DO $seed_event_extras$
DECLARE e RECORD; i INT := 0;
BEGIN
  FOR e IN SELECT id, status, created_at FROM events ORDER BY start_time LIMIT 30 LOOP
    i := i + 1;
    -- Professor color override + favorite for ~half the sample
    IF i % 2 = 0 THEN
      INSERT INTO event_overrides (professor_id, event_id, color, is_favorite)
      VALUES ('22222222-2222-2222-2222-222222222222'::uuid, e.id,
              CASE WHEN i % 4 = 0 THEN '#A855F7' ELSE '#0EA5E9' END,
              i % 4 = 0);
    END IF;
    -- Status history: scheduled → (cancelled if applicable)
    INSERT INTO event_status_history (event_id, status, changed_by, changed_at)
    VALUES (e.id, 'scheduled',
            'aaaa0000-0000-0000-0000-000000000001'::uuid,
            e.created_at);
    IF e.status = 'cancelled' THEN
      INSERT INTO event_status_history (event_id, status, changed_by, changed_at)
      VALUES (e.id, 'cancelled',
              'aaaa0000-0000-0000-0000-000000000001'::uuid,
              e.created_at + interval '1 day');
    END IF;
  END LOOP;
END;
$seed_event_extras$;

-- ═══════════════════════════════════════════════════════════════════════════
SELECT
  (SELECT COUNT(*) FROM profiles)              AS profiles,
  (SELECT COUNT(*) FROM referrals)             AS referrals,
  (SELECT COUNT(*) FROM events)                AS events,
  (SELECT COUNT(*) FROM activity_logs)         AS activity_logs,
  (SELECT COUNT(*) FROM event_overrides)       AS event_overrides,
  (SELECT COUNT(*) FROM event_status_history)  AS event_status_history;
