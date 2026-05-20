-- ═══════════════════════════════════════════════════════════════════════════
-- CURA — OVERDUE TEST SEED
-- ───────────────────────────────────────────────────────────────────────────
-- Seeds 4 accepted + ongoing referrals with a tentative appointment that
-- already passed 10+ days ago, making each one overdue (>7 days past appt).
--
--   Maria Clara Reyes  (aaaa0000-0000-0000-0000-000000000002)  — 2 referrals
--   Nina Aurelio       (aaaa0000-0000-0000-0000-000000000006)  — 2 referrals
--
-- Referral timeline per row:
--   created_at                 → 45 days ago
--   accepted_at                → 40 days ago  (Maria Clara / Nina accepts)
--   tentative_appointment_schedule → 30 days ago  (appointment already passed)
--   referral_status            → ongoing  (no final status yet)
--
-- Overdue clock: started 30 days ago (appointment date).
-- Days overdue today: ~23 days (30 days since appt − 7 grace = 23 overdue).
--
-- Run in the Supabase SQL Editor. Safe to re-run (uses ON CONFLICT DO NOTHING).
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Ensure required columns exist ──────────────────────────────────────────
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS tentative_appointment_schedule TIMESTAMPTZ;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS status_change_reason TEXT;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS status_change_professor_ids UUID[];
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS status_change_requested_at TIMESTAMPTZ;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS edit_requested_at TIMESTAMPTZ;

-- ─── Insert overdue referrals ────────────────────────────────────────────────
-- Columns: id, user_id, chart_number, medical_alert, age, sex,
--          clinical_section_origin, clinical_discipline_origin, treatment_service_origin,
--          clinical_section_destination, clinical_discipline_destination, treatment_service_destination,
--          special_case, notes_and_special_indications,
--          status, is_featured, accepted_by, accepted_by_user_id, accepted_at,
--          created_at, referral_status, tentative_appointment_schedule

INSERT INTO referrals (
  id, user_id,
  chart_number, medical_alert, age, sex,
  clinical_section_origin, clinical_discipline_origin, treatment_service_origin,
  clinical_section_destination, clinical_discipline_destination, treatment_service_destination,
  special_case, notes_and_special_indications,
  status, is_featured,
  accepted_by, accepted_by_user_id, accepted_at,
  created_at, referral_status,
  tentative_appointment_schedule
)
VALUES
-- ── Maria Clara accepts: Referral A ─────────────────────────────────────────
(
  'a0000001-0000-0000-0000-000000000001',
  'aaaa0000-0000-0000-0000-000000000003', -- created by Jose Garcia
  '2026-00201', 'Hypertension', 52, 'Male',
  'OM', 'Oral Diagnosis', 'Oral Diagnosis',
  'Prostho', 'Prosthodontics', 'Complete Dentures',
  NULL,  'Patient requires full denture fabrication. Missed follow-up appointment on Apr 15 9:00am.',
  'approved', TRUE,
  'Maria Clara Reyes',
  'aaaa0000-0000-0000-0000-000000000002', -- Maria Clara
  NOW() - INTERVAL '40 days',
  NOW() - INTERVAL '45 days',
  'ongoing',
  TIMESTAMPTZ '2026-04-15 09:00:00+08'   -- appointment was Apr 15 9:00am → ~23 days overdue
),

-- ── Maria Clara accepts: Referral B ─────────────────────────────────────────
(
  'a0000001-0000-0000-0000-000000000002',
  'aaaa0000-0000-0000-0000-000000000004', -- created by Liza Bautista
  '2026-00202', 'Diabetes', 38, 'Female',
  'OP', 'Restorative Dentistry', 'Composite Restoration',
  'Prostho', 'Prosthodontics', 'Removable Partial Dentures',
  'Medically Compromised',  'Patient is diabetic — coordinate with physician before procedure. Appointment was Apr 20 2:00pm.',
  'approved', TRUE,
  'Maria Clara Reyes',
  'aaaa0000-0000-0000-0000-000000000002', -- Maria Clara
  NOW() - INTERVAL '38 days',
  NOW() - INTERVAL '43 days',
  'ongoing',
  TIMESTAMPTZ '2026-04-20 14:00:00+08'   -- appointment was Apr 20 2:00pm → ~18 days overdue
),

-- ── Nina accepts: Referral C ─────────────────────────────────────────────────
(
  'a0000001-0000-0000-0000-000000000003',
  'aaaa0000-0000-0000-0000-000000000005', -- created by Marco Fernandez
  '2026-00203', 'None', 27, 'Female',
  'Prostho', 'Prosthodontics', 'Complete Dentures',
  'OP', 'Restorative Dentistry', 'Composite Restoration',
  NULL,  'Patient did not show up for scheduled appointment on Apr 25 10:30am. Needs rescheduling.',
  'approved', TRUE,
  'Nina Aurelio',
  'aaaa0000-0000-0000-0000-000000000006', -- Nina
  NOW() - INTERVAL '35 days',
  NOW() - INTERVAL '42 days',
  'ongoing',
  TIMESTAMPTZ '2026-04-25 10:30:00+08'   -- appointment was Apr 25 10:30am → ~13 days overdue
),

-- ── Nina accepts: Referral D ─────────────────────────────────────────────────
(
  'a0000001-0000-0000-0000-000000000004',
  'aaaa0000-0000-0000-0000-000000000001', -- created by Carlos Santos
  '2026-00204', 'Asthma', 15, 'Male',
  'OM', 'Oral Diagnosis', 'Oral Diagnosis',
  'OP', 'Undergraduate Dentistry', 'Pediatric Dentistry',
  'Pediatric',  'Young patient with missed ortho follow-up appointment on Apr 27 8:00am.',
  'approved', TRUE,
  'Nina Aurelio',
  'aaaa0000-0000-0000-0000-000000000006', -- Nina
  NOW() - INTERVAL '32 days',
  NOW() - INTERVAL '40 days',
  'ongoing',
  TIMESTAMPTZ '2026-04-27 08:00:00+08'   -- appointment was Apr 27 8:00am → ~11 days overdue
)
ON CONFLICT (id) DO NOTHING;

-- ─── Activity logs so ViewDetailsModal can build the status timeline ─────────
INSERT INTO activity_logs (user_id, action, description, metadata, created_at)
VALUES
-- Maria Clara accepts OVD-001
(
  'aaaa0000-0000-0000-0000-000000000002',
  'CHANGE_REFERRAL_STATUS',
  'Accepted referral 2026-00201',
  '{"referral_id":"a0000001-0000-0000-0000-000000000001","chart_number":"2026-00201","new_status":"ongoing"}',
  NOW() - INTERVAL '40 days'
),
-- Maria Clara accepts OVD-002
(
  'aaaa0000-0000-0000-0000-000000000002',
  'CHANGE_REFERRAL_STATUS',
  'Accepted referral 2026-00202',
  '{"referral_id":"a0000001-0000-0000-0000-000000000002","chart_number":"2026-00202","new_status":"ongoing"}',
  NOW() - INTERVAL '38 days'
),
-- Nina accepts OVD-003
(
  'aaaa0000-0000-0000-0000-000000000006',
  'CHANGE_REFERRAL_STATUS',
  'Accepted referral 2026-00203',
  '{"referral_id":"a0000001-0000-0000-0000-000000000003","chart_number":"2026-00203","new_status":"ongoing"}',
  NOW() - INTERVAL '35 days'
),
-- Nina accepts OVD-004
(
  'aaaa0000-0000-0000-0000-000000000006',
  'CHANGE_REFERRAL_STATUS',
  'Accepted referral 2026-00204',
  '{"referral_id":"a0000001-0000-0000-0000-000000000004","chart_number":"2026-00204","new_status":"ongoing"}',
  NOW() - INTERVAL '32 days'
);
