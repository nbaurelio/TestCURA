-- ═══════════════════════════════════════════════════════════════════════════
-- CURA Dashboard Seed Data — Run in Supabase SQL Editor
-- Creates additional advisee profiles + 15 varied referrals for testing
-- ═══════════════════════════════════════════════════════════════════════════

-- Professor Maria's ID (prof1@example.com)
-- 22222222-2222-2222-2222-222222222222

-- ─── Additional Advisee Profiles (adviser_ids → Prof Maria) ──────────────

INSERT INTO profiles (id, email, first_name, last_name, year_level, clinical_department, role, adviser_ids)
VALUES
  ('aaaa1111-1111-1111-1111-111111111111', 'carlos@example.com', 'Carlos', 'Santos', '4th yr', 'OM', 'clinician', ARRAY['22222222-2222-2222-2222-222222222222']),
  ('aaaa2222-2222-2222-2222-222222222222', 'maria.c@example.com', 'Maria Clara', 'Reyes', '5th yr', 'Prostho', 'clinician', ARRAY['22222222-2222-2222-2222-222222222222']),
  ('aaaa3333-3333-3333-3333-333333333333', 'jose@example.com', 'Jose', 'Garcia', '4th yr', 'OP', 'clinician', ARRAY['22222222-2222-2222-2222-222222222222'])
ON CONFLICT (id) DO NOTHING;

-- ─── Varied Referrals ────────────────────────────────────────────────────
-- RULES:
--   • Clinicians CREATE referrals (user_id = creator)
--   • A DIFFERENT clinician ACCEPTS the referral (accepted_by ≠ creator)
--   • Professors APPROVE referrals (status = 'approved'), they never accept
--   • Professors approve/decline requests from their advisees only

-- === REFERRALS CREATED BY CARLOS (aaaa1111) ===

-- 1. Created Jan 2026, accepted by Maria Clara, COMPLETED
INSERT INTO referrals (user_id, chart_number, treatment, age, medical_alert, clinical_section_origin, clinical_discipline_origin, treatment_service_origin, clinical_section_destination, clinical_discipline_destination, treatment_service_destination, notes_and_special_indications, status, accepted_by, accepted_by_user_id, accepted_at, referral_status, referral_status_changed_at, is_featured, created_at)
VALUES ('aaaa1111-1111-1111-1111-111111111111', '2026-00010', 'Extraction', 45, 'Hypertension', 'Prostho', 'Prosthodontics', 'Removable Partial Dentures', 'OM', 'Oral Surgery', 'Extraction', 'Needs extraction before denture', 'approved', 'Maria Clara Reyes', 'aaaa2222-2222-2222-2222-222222222222', '2026-01-10T09:00:00Z', 'completed', '2026-02-15T10:00:00Z', true, '2026-01-08T08:00:00Z');

-- 2. Created Feb 2026, accepted by Jose, ONGOING
INSERT INTO referrals (user_id, chart_number, treatment, age, medical_alert, clinical_section_origin, clinical_discipline_origin, treatment_service_origin, clinical_section_destination, clinical_discipline_destination, treatment_service_destination, notes_and_special_indications, status, accepted_by, accepted_by_user_id, accepted_at, referral_status, is_featured, created_at)
VALUES ('aaaa1111-1111-1111-1111-111111111111', '2026-00011', 'Root Canal Treatment', 32, 'None', 'OP', 'Restorative Dentistry', 'Composite Restoration', 'OM', 'Endodontics', 'Root Canal Treatment', 'Deep caries on tooth #36', 'approved', 'Jose Garcia', 'aaaa3333-3333-3333-3333-333333333333', '2026-02-05T10:00:00Z', 'ongoing', true, '2026-02-03T08:00:00Z');

-- 3. Created Mar 2026, NOT accepted, still PENDING (overdue)
INSERT INTO referrals (user_id, chart_number, treatment, age, medical_alert, clinical_section_origin, clinical_discipline_origin, treatment_service_origin, clinical_section_destination, clinical_discipline_destination, treatment_service_destination, notes_and_special_indications, status, accepted_by, referral_status, is_featured, created_at)
VALUES ('aaaa1111-1111-1111-1111-111111111111', '2026-00012', 'Scaling & Polishing', 28, 'None', 'OP', 'Restorative Dentistry', 'Composite Restoration', 'OM', 'Periodontics', 'Scaling & Polishing', 'Generalized calculus deposits', 'pending', 'None', 'ongoing', false, '2026-03-01T08:00:00Z');

-- 4. Created Mar 2026, accepted by Maria Clara, DEFERRED
INSERT INTO referrals (user_id, chart_number, treatment, age, medical_alert, clinical_section_origin, clinical_discipline_origin, treatment_service_origin, clinical_section_destination, clinical_discipline_destination, treatment_service_destination, notes_and_special_indications, status, accepted_by, accepted_by_user_id, accepted_at, referral_status, referral_status_changed_at, is_featured, created_at)
VALUES ('aaaa1111-1111-1111-1111-111111111111', '2026-00013', 'Crown', 55, 'Diabetes', 'OM', 'Endodontics', 'Root Canal Treatment', 'OP', 'Fixed Partial Dentures', 'Crown', 'Post-endo crown needed', 'approved', 'Maria Clara Reyes', 'aaaa2222-2222-2222-2222-222222222222', '2026-03-12T09:00:00Z', 'deferred', '2026-03-25T14:00:00Z', true, '2026-03-10T08:00:00Z');

-- === REFERRALS CREATED BY MARIA CLARA (aaaa2222) ===

-- 5. Created Jan 2026, accepted by Carlos, COMPLETED
INSERT INTO referrals (user_id, chart_number, treatment, age, medical_alert, clinical_section_origin, clinical_discipline_origin, treatment_service_origin, clinical_section_destination, clinical_discipline_destination, treatment_service_destination, notes_and_special_indications, status, accepted_by, accepted_by_user_id, accepted_at, referral_status, referral_status_changed_at, is_featured, created_at)
VALUES ('aaaa2222-2222-2222-2222-222222222222', '2026-00020', 'Complete Dentures', 68, 'None', 'OM', 'Oral Diagnosis', 'Oral Diagnosis', 'Prostho', 'Prosthodontics', 'Complete Dentures', 'Edentulous patient', 'approved', 'Carlos Santos', 'aaaa1111-1111-1111-1111-111111111111', '2026-01-18T10:00:00Z', 'completed', '2026-02-28T15:00:00Z', true, '2026-01-15T08:00:00Z');

-- 6. Created Feb 2026, accepted by Jose, COMPLETED
INSERT INTO referrals (user_id, chart_number, treatment, age, medical_alert, clinical_section_origin, clinical_discipline_origin, treatment_service_origin, clinical_section_destination, clinical_discipline_destination, treatment_service_destination, notes_and_special_indications, status, accepted_by, accepted_by_user_id, accepted_at, referral_status, referral_status_changed_at, is_featured, created_at)
VALUES ('aaaa2222-2222-2222-2222-222222222222', '2026-00021', 'Composite Restoration', 22, 'None', 'OM', 'Periodontics', 'Scaling & Polishing', 'OP', 'Restorative Dentistry', 'Composite Restoration', 'Class II restoration needed', 'approved', 'Jose Garcia', 'aaaa3333-3333-3333-3333-333333333333', '2026-02-22T09:30:00Z', 'completed', '2026-03-15T11:00:00Z', true, '2026-02-20T08:00:00Z');

-- 7. Created Mar 2026, accepted by Carlos, BLACKLISTED
INSERT INTO referrals (user_id, chart_number, treatment, age, medical_alert, clinical_section_origin, clinical_discipline_origin, treatment_service_origin, clinical_section_destination, clinical_discipline_destination, treatment_service_destination, notes_and_special_indications, status, accepted_by, accepted_by_user_id, accepted_at, referral_status, referral_status_changed_at, is_featured, created_at)
VALUES ('aaaa2222-2222-2222-2222-222222222222', '2026-00022', 'Pit & Fissure Sealant', 12, 'None', 'OM', 'Oral Diagnosis', 'Oral Diagnosis', 'OP', 'Pediatric Dentistry', 'Pedo Pit & Fissure Sealant', 'Young patient — multiple pits', 'approved', 'Carlos Santos', 'aaaa1111-1111-1111-1111-111111111111', '2026-03-05T10:00:00Z', 'blacklisted', '2026-03-20T10:00:00Z', true, '2026-03-03T08:00:00Z');

-- 8. Created Apr 2026, accepted by Jose, ONGOING
INSERT INTO referrals (user_id, chart_number, treatment, age, medical_alert, clinical_section_origin, clinical_discipline_origin, treatment_service_origin, clinical_section_destination, clinical_discipline_destination, treatment_service_destination, notes_and_special_indications, status, accepted_by, accepted_by_user_id, accepted_at, referral_status, is_featured, created_at)
VALUES ('aaaa2222-2222-2222-2222-222222222222', '2026-00023', 'Removable Partial Dentures', 60, 'Heart Condition', 'OM', 'Oral Surgery', 'Extraction', 'Prostho', 'Prosthodontics', 'Removable Partial Dentures - Removable Partial Dentures', 'Post-extraction prosthetic rehab', 'approved', 'Jose Garcia', 'aaaa3333-3333-3333-3333-333333333333', '2026-04-08T09:00:00Z', 'ongoing', true, '2026-04-05T08:00:00Z');

-- === REFERRALS CREATED BY JOSE (aaaa3333) ===

-- 9. Created Jan 2026, accepted by Maria Clara, COMPLETED
INSERT INTO referrals (user_id, chart_number, treatment, age, medical_alert, clinical_section_origin, clinical_discipline_origin, treatment_service_origin, clinical_section_destination, clinical_discipline_destination, treatment_service_destination, notes_and_special_indications, status, accepted_by, accepted_by_user_id, accepted_at, referral_status, referral_status_changed_at, is_featured, created_at)
VALUES ('aaaa3333-3333-3333-3333-333333333333', '2026-00030', 'Flap Surgery', 50, 'None', 'Prostho', 'Prosthodontics', 'Complete Dentures', 'OM', 'Oral Surgery', 'Flap Surgery', 'Advanced periodontal disease', 'approved', 'Maria Clara Reyes', 'aaaa2222-2222-2222-2222-222222222222', '2026-01-22T10:00:00Z', 'completed', '2026-02-10T16:00:00Z', true, '2026-01-20T08:00:00Z');

-- 10. Created Feb 2026, accepted by Carlos, COMPLETED
INSERT INTO referrals (user_id, chart_number, treatment, age, medical_alert, clinical_section_origin, clinical_discipline_origin, treatment_service_origin, clinical_section_destination, clinical_discipline_destination, treatment_service_destination, notes_and_special_indications, status, accepted_by, accepted_by_user_id, accepted_at, referral_status, referral_status_changed_at, is_featured, created_at)
VALUES ('aaaa3333-3333-3333-3333-333333333333', '2026-00031', 'Pedo Restoration', 8, 'None', 'OM', 'Oral Diagnosis', 'Oral Diagnosis', 'OP', 'Pediatric Dentistry', 'Pedo Restoration', 'Pediatric patient with caries', 'approved', 'Carlos Santos', 'aaaa1111-1111-1111-1111-111111111111', '2026-02-15T11:00:00Z', 'completed', '2026-03-01T09:00:00Z', true, '2026-02-12T08:00:00Z');

-- 11. Created Mar 2026, NOT accepted, PENDING (overdue)
INSERT INTO referrals (user_id, chart_number, treatment, age, medical_alert, clinical_section_origin, clinical_discipline_origin, treatment_service_origin, clinical_section_destination, clinical_discipline_destination, treatment_service_destination, notes_and_special_indications, status, accepted_by, referral_status, is_featured, created_at)
VALUES ('aaaa3333-3333-3333-3333-333333333333', '2026-00032', 'Bridge', 42, 'Asthma', 'OM', 'Periodontics', 'Scaling & Polishing', 'OP', 'Fixed Partial Dentures', 'Bridge', 'Missing tooth #14, bridge planned', 'pending', 'None', 'ongoing', false, '2026-03-05T08:00:00Z');

-- 12. Created Apr 2026, accepted by Maria Clara, ONGOING
INSERT INTO referrals (user_id, chart_number, treatment, age, medical_alert, clinical_section_origin, clinical_discipline_origin, treatment_service_origin, clinical_section_destination, clinical_discipline_destination, treatment_service_destination, notes_and_special_indications, status, accepted_by, accepted_by_user_id, accepted_at, referral_status, is_featured, created_at)
VALUES ('aaaa3333-3333-3333-3333-333333333333', '2026-00033', 'Preventive Orthodontics', 10, 'None', 'OM', 'Oral Diagnosis', 'Oral Diagnosis', 'OP', 'Undergraduate Orthodontics', 'Preventive Orthodontics', 'Thumb sucking habit', 'approved', 'Maria Clara Reyes', 'aaaa2222-2222-2222-2222-222222222222', '2026-04-15T10:00:00Z', 'ongoing', true, '2026-04-12T08:00:00Z');

-- 13. Created Apr 2026, accepted by Carlos, COMPLETED
INSERT INTO referrals (user_id, chart_number, treatment, age, medical_alert, clinical_section_origin, clinical_discipline_origin, treatment_service_origin, clinical_section_destination, clinical_discipline_destination, treatment_service_destination, notes_and_special_indications, status, accepted_by, accepted_by_user_id, accepted_at, referral_status, referral_status_changed_at, is_featured, created_at)
VALUES ('aaaa3333-3333-3333-3333-333333333333', '2026-00034', 'Glass Ionomer Restoration', 35, 'None', 'OM', 'Periodontics', 'Scaling & Polishing', 'OP', 'Restorative Dentistry', 'Glass Ionomer Restoration', 'Cervical abrasion restoration', 'approved', 'Carlos Santos', 'aaaa1111-1111-1111-1111-111111111111', '2026-04-20T09:00:00Z', 'completed', '2026-04-28T14:00:00Z', true, '2026-04-18T08:00:00Z');

-- 14. Created Apr 2026, accepted by Carlos, ONGOING (re-referred)
INSERT INTO referrals (user_id, chart_number, treatment, age, medical_alert, clinical_section_origin, clinical_discipline_origin, treatment_service_origin, clinical_section_destination, clinical_discipline_destination, treatment_service_destination, notes_and_special_indications, status, accepted_by, accepted_by_user_id, accepted_at, referral_status, rerefer_request_status, rerefer_request_reason, is_featured, created_at)
VALUES ('aaaa3333-3333-3333-3333-333333333333', '2026-00035', 'Non-Surgical Root Planing', 38, 'None', 'OP', 'Restorative Dentistry', 'Composite Restoration', 'OM', 'Periodontics', 'Non-Surgical Root Planing', 'Deep pockets need perio treatment first', 'approved', 'Carlos Santos', 'aaaa1111-1111-1111-1111-111111111111', '2026-04-22T10:00:00Z', 'ongoing', 'approved', 'Patient moved to different area', true, '2026-04-20T08:00:00Z');

-- 15. Created Apr 2026, NOT accepted, PENDING
INSERT INTO referrals (user_id, chart_number, treatment, age, medical_alert, clinical_section_origin, clinical_discipline_origin, treatment_service_origin, clinical_section_destination, clinical_discipline_destination, treatment_service_destination, notes_and_special_indications, status, accepted_by, referral_status, is_featured, created_at)
VALUES ('aaaa1111-1111-1111-1111-111111111111', '2026-00014', 'Odontectomy', 19, 'Epilepsy', 'OP', 'Pediatric Dentistry', 'Pedo Extraction', 'OM', 'Oral Surgery', 'Odontectomy', 'Impacted wisdom tooth', 'pending', 'None', 'ongoing', false, '2026-04-28T08:00:00Z');

-- ═══════════════════════════════════════════════════════════════════════════
-- PROFESSOR 2 (prof2@example.com) — ID: 33333333-3333-3333-3333-333333333333
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Advisee Profiles for Prof 2 ────────────────────────────────────────

INSERT INTO profiles (id, email, first_name, last_name, year_level, clinical_department, role, adviser_ids)
VALUES
  ('bbbb1111-1111-1111-1111-111111111111', 'anna@example.com', 'Anna', 'Mendoza', '4th yr', 'OP', 'clinician', ARRAY['33333333-3333-3333-3333-333333333333']),
  ('bbbb2222-2222-2222-2222-222222222222', 'miguel@example.com', 'Miguel', 'Tan', '5th yr', 'OM', 'clinician', ARRAY['33333333-3333-3333-3333-333333333333']),
  ('bbbb3333-3333-3333-3333-333333333333', 'sarah@example.com', 'Sarah', 'Lopez', '4th yr', 'Prostho', 'clinician', ARRAY['33333333-3333-3333-3333-333333333333'])
ON CONFLICT (id) DO NOTHING;

-- ─── Varied Referrals for Prof 2 Advisees ────────────────────────────────

-- === REFERRALS CREATED BY ANNA (bbbb1111) ===

-- P2-1. Created Dec 2025, accepted by Miguel, COMPLETED
INSERT INTO referrals (user_id, chart_number, treatment, age, medical_alert, clinical_section_origin, clinical_discipline_origin, treatment_service_origin, clinical_section_destination, clinical_discipline_destination, treatment_service_destination, notes_and_special_indications, status, accepted_by, accepted_by_user_id, accepted_at, referral_status, referral_status_changed_at, is_featured, created_at)
VALUES ('bbbb1111-1111-1111-1111-111111111111', '2025-00050', 'Composite Restoration', 30, 'None', 'OM', 'Oral Diagnosis', 'Oral Diagnosis', 'OP', 'Restorative Dentistry', 'Composite Restoration', 'Class I composite on #46', 'approved', 'Miguel Tan', 'bbbb2222-2222-2222-2222-222222222222', '2025-12-18T09:00:00Z', 'completed', '2026-01-05T11:00:00Z', true, '2025-12-15T08:00:00Z');

-- P2-2. Created Jan 2026, accepted by Sarah, COMPLETED
INSERT INTO referrals (user_id, chart_number, treatment, age, medical_alert, clinical_section_origin, clinical_discipline_origin, treatment_service_origin, clinical_section_destination, clinical_discipline_destination, treatment_service_destination, notes_and_special_indications, status, accepted_by, accepted_by_user_id, accepted_at, referral_status, referral_status_changed_at, is_featured, created_at)
VALUES ('bbbb1111-1111-1111-1111-111111111111', '2026-00051', 'Extraction', 62, 'Hypertension', 'Prostho', 'Prosthodontics', 'Complete Dentures', 'OM', 'Oral Surgery', 'Extraction', 'Pre-prosthetic extraction', 'approved', 'Sarah Lopez', 'bbbb3333-3333-3333-3333-333333333333', '2026-01-12T10:00:00Z', 'completed', '2026-01-25T14:00:00Z', true, '2026-01-10T08:00:00Z');

-- P2-3. Created Feb 2026, accepted by Sarah, ONGOING
INSERT INTO referrals (user_id, chart_number, treatment, age, medical_alert, clinical_section_origin, clinical_discipline_origin, treatment_service_origin, clinical_section_destination, clinical_discipline_destination, treatment_service_destination, notes_and_special_indications, status, accepted_by, accepted_by_user_id, accepted_at, referral_status, is_featured, created_at)
VALUES ('bbbb1111-1111-1111-1111-111111111111', '2026-00052', 'Pedo Pulp Therapy', 7, 'None', 'OM', 'Oral Diagnosis', 'Oral Diagnosis', 'OP', 'Pediatric Dentistry', 'Pedo Pulp Therapy', 'Pulpotomy on primary molar', 'approved', 'Sarah Lopez', 'bbbb3333-3333-3333-3333-333333333333', '2026-02-08T10:00:00Z', 'ongoing', true, '2026-02-05T08:00:00Z');

-- === REFERRALS CREATED BY MIGUEL (bbbb2222) ===

-- P2-4. Created Feb 2026, accepted by Anna, COMPLETED
INSERT INTO referrals (user_id, chart_number, treatment, age, medical_alert, clinical_section_origin, clinical_discipline_origin, treatment_service_origin, clinical_section_destination, clinical_discipline_destination, treatment_service_destination, notes_and_special_indications, status, accepted_by, accepted_by_user_id, accepted_at, referral_status, referral_status_changed_at, is_featured, created_at)
VALUES ('bbbb2222-2222-2222-2222-222222222222', '2026-00060', 'Scaling & Polishing', 25, 'None', 'OP', 'Restorative Dentistry', 'Composite Restoration', 'OM', 'Periodontics', 'Scaling & Polishing', 'Pre-restorative perio clearance', 'approved', 'Anna Mendoza', 'bbbb1111-1111-1111-1111-111111111111', '2026-02-20T09:00:00Z', 'completed', '2026-03-08T10:00:00Z', true, '2026-02-18T08:00:00Z');

-- P2-5. Created Mar 2026, accepted by Anna, DEFERRED
INSERT INTO referrals (user_id, chart_number, treatment, age, medical_alert, clinical_section_origin, clinical_discipline_origin, treatment_service_origin, clinical_section_destination, clinical_discipline_destination, treatment_service_destination, notes_and_special_indications, status, accepted_by, accepted_by_user_id, accepted_at, referral_status, referral_status_changed_at, is_featured, created_at)
VALUES ('bbbb2222-2222-2222-2222-222222222222', '2026-00061', 'Root Canal Treatment', 48, 'Diabetes', 'OM', 'Periodontics', 'Scaling & Polishing', 'OM', 'Endodontics', 'Root Canal Treatment', 'Irreversible pulpitis #15', 'approved', 'Anna Mendoza', 'bbbb1111-1111-1111-1111-111111111111', '2026-03-07T10:00:00Z', 'deferred', '2026-03-22T15:00:00Z', true, '2026-03-05T08:00:00Z');

-- P2-6. Created Mar 2026, NOT accepted, PENDING (overdue)
INSERT INTO referrals (user_id, chart_number, treatment, age, medical_alert, clinical_section_origin, clinical_discipline_origin, treatment_service_origin, clinical_section_destination, clinical_discipline_destination, treatment_service_destination, notes_and_special_indications, status, accepted_by, referral_status, is_featured, created_at)
VALUES ('bbbb2222-2222-2222-2222-222222222222', '2026-00062', 'Bridge', 53, 'None', 'OM', 'Oral Surgery', 'Extraction', 'OP', 'Fixed Partial Dentures', 'Bridge', 'Missing #36, fixed bridge planned', 'pending', 'None', 'ongoing', false, '2026-03-10T08:00:00Z');

-- === REFERRALS CREATED BY SARAH (bbbb3333) ===

-- P2-7. Created Jan 2026, accepted by Miguel, COMPLETED
INSERT INTO referrals (user_id, chart_number, treatment, age, medical_alert, clinical_section_origin, clinical_discipline_origin, treatment_service_origin, clinical_section_destination, clinical_discipline_destination, treatment_service_destination, notes_and_special_indications, status, accepted_by, accepted_by_user_id, accepted_at, referral_status, referral_status_changed_at, is_featured, created_at)
VALUES ('bbbb3333-3333-3333-3333-333333333333', '2026-00070', 'Removable Partial Dentures', 70, 'None', 'OM', 'Oral Diagnosis', 'Oral Diagnosis', 'Prostho', 'Prosthodontics', 'Removable Partial Dentures - Removable Partial Dentures', 'Kennedy Class I RPD', 'approved', 'Miguel Tan', 'bbbb2222-2222-2222-2222-222222222222', '2026-01-25T10:00:00Z', 'completed', '2026-02-20T16:00:00Z', true, '2026-01-22T08:00:00Z');

-- P2-8. Created Apr 2026, accepted by Anna, ONGOING
INSERT INTO referrals (user_id, chart_number, treatment, age, medical_alert, clinical_section_origin, clinical_discipline_origin, treatment_service_origin, clinical_section_destination, clinical_discipline_destination, treatment_service_destination, notes_and_special_indications, status, accepted_by, accepted_by_user_id, accepted_at, referral_status, is_featured, created_at)
VALUES ('bbbb3333-3333-3333-3333-333333333333', '2026-00071', 'Space Maintainer', 6, 'None', 'OM', 'Oral Diagnosis', 'Oral Diagnosis', 'OP', 'Pediatric Dentistry', 'Space Maintainer', 'Early loss of primary molar', 'approved', 'Anna Mendoza', 'bbbb1111-1111-1111-1111-111111111111', '2026-04-10T09:00:00Z', 'ongoing', true, '2026-04-08T08:00:00Z');

-- P2-9. Created Apr 2026, accepted by Miguel, COMPLETED
INSERT INTO referrals (user_id, chart_number, treatment, age, medical_alert, clinical_section_origin, clinical_discipline_origin, treatment_service_origin, clinical_section_destination, clinical_discipline_destination, treatment_service_destination, notes_and_special_indications, status, accepted_by, accepted_by_user_id, accepted_at, referral_status, referral_status_changed_at, is_featured, created_at)
VALUES ('bbbb3333-3333-3333-3333-333333333333', '2026-00072', 'Direct Onlay', 40, 'Asthma', 'OM', 'Periodontics', 'Scaling & Polishing', 'OP', 'Restorative Dentistry', 'Direct Onlay', 'Large restoration with cusp coverage', 'approved', 'Miguel Tan', 'bbbb2222-2222-2222-2222-222222222222', '2026-04-22T10:00:00Z', 'completed', '2026-04-29T11:00:00Z', true, '2026-04-20T08:00:00Z');

-- P2-10. Created Apr 2026, accepted by Anna, BLACKLISTED
INSERT INTO referrals (user_id, chart_number, treatment, age, medical_alert, clinical_section_origin, clinical_discipline_origin, treatment_service_origin, clinical_section_destination, clinical_discipline_destination, treatment_service_destination, notes_and_special_indications, status, accepted_by, accepted_by_user_id, accepted_at, referral_status, referral_status_changed_at, is_featured, created_at)
VALUES ('bbbb3333-3333-3333-3333-333333333333', '2026-00073', 'Interceptive Orthodontics', 11, 'None', 'OM', 'Oral Diagnosis', 'Oral Diagnosis', 'OP', 'Undergraduate Orthodontics', 'Interceptive Orthodontics', 'Crossbite correction needed', 'approved', 'Anna Mendoza', 'bbbb1111-1111-1111-1111-111111111111', '2026-04-25T10:00:00Z', 'blacklisted', '2026-04-30T09:00:00Z', true, '2026-04-23T08:00:00Z');

-- ═══════════════════════════════════════════════════════════════════════════
-- CLINICAL ADMIN (admin@example.com) — ID: cccc0000-0000-0000-0000-000000000000
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO profiles (id, email, first_name, last_name, year_level, clinical_department, role)
VALUES ('cccc0000-0000-0000-0000-000000000000', 'admin@example.com', 'Admin', 'User', NULL, NULL, 'clinical_admin')
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- ADDITIONAL REFERRALS — Section variety (Ortho, Any, + cross-section combos)
-- Uses existing clinician IDs from both professor groups
-- ═══════════════════════════════════════════════════════════════════════════

-- V1. OM → Ortho, Carlos, accepted by Anna, COMPLETED (Dec 2025)
INSERT INTO referrals (user_id, chart_number, treatment, age, medical_alert, clinical_section_origin, clinical_discipline_origin, treatment_service_origin, clinical_section_destination, clinical_discipline_destination, treatment_service_destination, notes_and_special_indications, status, accepted_by, accepted_by_user_id, accepted_at, referral_status, referral_status_changed_at, is_featured, created_at)
VALUES ('aaaa1111-1111-1111-1111-111111111111', '2025-00080', 'Corrective Orthodontics', 14, 'None', 'OM', 'Oral Diagnosis', 'Oral Diagnosis', 'Ortho', 'Corrective Orthodontics', 'Corrective Orthodontics', 'Class II malocclusion — needs ortho evaluation', 'approved', 'Anna Mendoza', 'bbbb1111-1111-1111-1111-111111111111', '2025-12-20T10:00:00Z', 'completed', '2026-02-01T14:00:00Z', true, '2025-12-18T08:00:00Z');

-- V2. Ortho → OM, Miguel, accepted by Jose, ONGOING (Jan 2026)
INSERT INTO referrals (user_id, chart_number, treatment, age, medical_alert, clinical_section_origin, clinical_discipline_origin, treatment_service_origin, clinical_section_destination, clinical_discipline_destination, treatment_service_destination, notes_and_special_indications, status, accepted_by, accepted_by_user_id, accepted_at, referral_status, is_featured, created_at)
VALUES ('bbbb2222-2222-2222-2222-222222222222', '2026-00081', 'Extraction', 16, 'None', 'Ortho', 'Corrective Orthodontics', 'Corrective Orthodontics', 'OM', 'Oral Surgery', 'Extraction', 'Pre-ortho extraction of premolars #14 #24', 'approved', 'Jose Garcia', 'aaaa3333-3333-3333-3333-333333333333', '2026-01-15T09:00:00Z', 'ongoing', true, '2026-01-12T08:00:00Z');

-- V3. Prostho → Ortho, Sarah, accepted by Carlos, COMPLETED (Jan 2026)
INSERT INTO referrals (user_id, chart_number, treatment, age, medical_alert, clinical_section_origin, clinical_discipline_origin, treatment_service_origin, clinical_section_destination, clinical_discipline_destination, treatment_service_destination, notes_and_special_indications, status, accepted_by, accepted_by_user_id, accepted_at, referral_status, referral_status_changed_at, is_featured, created_at)
VALUES ('bbbb3333-3333-3333-3333-333333333333', '2026-00082', 'Corrective Orthodontics', 20, 'None', 'Prostho', 'Prosthodontics', 'Complete Dentures', 'Ortho', 'Corrective Orthodontics', 'Corrective Orthodontics', 'Pre-prosthetic orthodontic alignment', 'approved', 'Carlos Santos', 'aaaa1111-1111-1111-1111-111111111111', '2026-01-28T10:00:00Z', 'completed', '2026-03-10T11:00:00Z', true, '2026-01-25T08:00:00Z');

-- V4. OP → OM, Maria Clara, accepted by Miguel, ONGOING (Feb 2026)
INSERT INTO referrals (user_id, chart_number, treatment, age, medical_alert, clinical_section_origin, clinical_discipline_origin, treatment_service_origin, clinical_section_destination, clinical_discipline_destination, treatment_service_destination, notes_and_special_indications, status, accepted_by, accepted_by_user_id, accepted_at, referral_status, is_featured, created_at)
VALUES ('aaaa2222-2222-2222-2222-222222222222', '2026-00083', 'Scaling & Polishing', 55, 'Diabetes', 'OP', 'Restorative Dentistry', 'Composite Restoration', 'OM', 'Periodontics', 'Scaling & Polishing', 'Pre-restorative perio clearance needed', 'approved', 'Miguel Tan', 'bbbb2222-2222-2222-2222-222222222222', '2026-02-12T09:00:00Z', 'ongoing', true, '2026-02-10T08:00:00Z');

-- V5. Prostho → OP, Anna, accepted by Maria Clara, COMPLETED (Feb 2026)
INSERT INTO referrals (user_id, chart_number, treatment, age, medical_alert, clinical_section_origin, clinical_discipline_origin, treatment_service_origin, clinical_section_destination, clinical_discipline_destination, treatment_service_destination, notes_and_special_indications, status, accepted_by, accepted_by_user_id, accepted_at, referral_status, referral_status_changed_at, is_featured, created_at)
VALUES ('bbbb1111-1111-1111-1111-111111111111', '2026-00084', 'Crown', 47, 'None', 'Prostho', 'Prosthodontics', 'Complete Dentures', 'OP', 'Fixed Partial Dentures', 'Crown', 'Post-prosthetic crown restoration', 'approved', 'Maria Clara Reyes', 'aaaa2222-2222-2222-2222-222222222222', '2026-02-22T10:00:00Z', 'completed', '2026-03-20T15:00:00Z', true, '2026-02-20T08:00:00Z');

-- V6. Ortho → OP, Jose, accepted by Sarah, DEFERRED (Mar 2026)
INSERT INTO referrals (user_id, chart_number, treatment, age, medical_alert, clinical_section_origin, clinical_discipline_origin, treatment_service_origin, clinical_section_destination, clinical_discipline_destination, treatment_service_destination, notes_and_special_indications, status, accepted_by, accepted_by_user_id, accepted_at, referral_status, referral_status_changed_at, is_featured, created_at)
VALUES ('aaaa3333-3333-3333-3333-333333333333', '2026-00085', 'Composite Restoration', 18, 'None', 'Ortho', 'Corrective Orthodontics', 'Corrective Orthodontics', 'OP', 'Restorative Dentistry', 'Composite Restoration', 'Post-ortho bonding removal + restoration', 'approved', 'Sarah Lopez', 'bbbb3333-3333-3333-3333-333333333333', '2026-03-08T09:00:00Z', 'deferred', '2026-03-28T14:00:00Z', true, '2026-03-05T08:00:00Z');

-- V7. OM → Prostho, Miguel, accepted by Carlos, COMPLETED (Mar 2026)
INSERT INTO referrals (user_id, chart_number, treatment, age, medical_alert, clinical_section_origin, clinical_discipline_origin, treatment_service_origin, clinical_section_destination, clinical_discipline_destination, treatment_service_destination, notes_and_special_indications, status, accepted_by, accepted_by_user_id, accepted_at, referral_status, referral_status_changed_at, is_featured, created_at)
VALUES ('bbbb2222-2222-2222-2222-222222222222', '2026-00086', 'Complete Dentures', 72, 'Heart Condition', 'OM', 'Oral Diagnosis', 'Oral Diagnosis', 'Prostho', 'Prosthodontics', 'Complete Dentures', 'Edentulous patient needs full dentures', 'approved', 'Carlos Santos', 'aaaa1111-1111-1111-1111-111111111111', '2026-03-15T10:00:00Z', 'completed', '2026-04-10T16:00:00Z', true, '2026-03-12T08:00:00Z');

-- V8. Ortho → Prostho, Anna, accepted by Jose, ONGOING (Mar 2026)
INSERT INTO referrals (user_id, chart_number, treatment, age, medical_alert, clinical_section_origin, clinical_discipline_origin, treatment_service_origin, clinical_section_destination, clinical_discipline_destination, treatment_service_destination, notes_and_special_indications, status, accepted_by, accepted_by_user_id, accepted_at, referral_status, is_featured, created_at)
VALUES ('bbbb1111-1111-1111-1111-111111111111', '2026-00087', 'Removable Partial Dentures', 58, 'None', 'Ortho', 'Corrective Orthodontics', 'Corrective Orthodontics', 'Prostho', 'Prosthodontics', 'Removable Partial Dentures - Removable Partial Dentures', 'Post-ortho prosthetic rehabilitation', 'approved', 'Jose Garcia', 'aaaa3333-3333-3333-3333-333333333333', '2026-03-22T09:00:00Z', 'ongoing', true, '2026-03-20T08:00:00Z');

-- V9. OM → Ortho, Carlos, NOT accepted, PENDING (Apr 2026)
INSERT INTO referrals (user_id, chart_number, treatment, age, medical_alert, clinical_section_origin, clinical_discipline_origin, treatment_service_origin, clinical_section_destination, clinical_discipline_destination, treatment_service_destination, notes_and_special_indications, status, accepted_by, referral_status, is_featured, created_at)
VALUES ('aaaa1111-1111-1111-1111-111111111111', '2026-00088', 'Corrective Orthodontics', 33, 'Epilepsy', 'OM', 'Oral Diagnosis', 'Special Case', 'Ortho', 'Corrective Orthodontics', 'Corrective Orthodontics', 'Skeletal discrepancy — needs ortho consult', 'pending', 'None', 'ongoing', false, '2026-04-01T08:00:00Z');

-- V10. Prostho → OP, Sarah, accepted by Anna, BLACKLISTED (Apr 2026)
INSERT INTO referrals (user_id, chart_number, treatment, age, medical_alert, clinical_section_origin, clinical_discipline_origin, treatment_service_origin, clinical_section_destination, clinical_discipline_destination, treatment_service_destination, notes_and_special_indications, status, accepted_by, accepted_by_user_id, accepted_at, referral_status, referral_status_changed_at, is_featured, created_at)
VALUES ('bbbb3333-3333-3333-3333-333333333333', '2026-00089', 'Composite Restoration', 29, 'None', 'Prostho', 'Prosthodontics', 'Removable Partial Dentures - Removable Partial Dentures', 'OP', 'Restorative Dentistry', 'Composite Restoration', 'Patient non-compliant — blacklisted', 'approved', 'Anna Mendoza', 'bbbb1111-1111-1111-1111-111111111111', '2026-04-05T10:00:00Z', 'blacklisted', '2026-04-18T09:00:00Z', true, '2026-04-03T08:00:00Z');

-- V11. OM → Ortho, Maria Clara, accepted by Miguel, COMPLETED (Apr 2026)
INSERT INTO referrals (user_id, chart_number, treatment, age, medical_alert, clinical_section_origin, clinical_discipline_origin, treatment_service_origin, clinical_section_destination, clinical_discipline_destination, treatment_service_destination, notes_and_special_indications, status, accepted_by, accepted_by_user_id, accepted_at, referral_status, referral_status_changed_at, is_featured, created_at)
VALUES ('aaaa2222-2222-2222-2222-222222222222', '2026-00090', 'Corrective Orthodontics', 13, 'Asthma', 'OM', 'Oral Diagnosis', 'Oral Diagnosis', 'Ortho', 'Corrective Orthodontics', 'Corrective Orthodontics', 'Class III correction — ortho referral', 'approved', 'Miguel Tan', 'bbbb2222-2222-2222-2222-222222222222', '2026-04-14T09:00:00Z', 'completed', '2026-04-28T10:00:00Z', true, '2026-04-12T08:00:00Z');

-- V12. OP → Ortho, Jose, accepted by Sarah, ONGOING (Apr 2026)
INSERT INTO referrals (user_id, chart_number, treatment, age, medical_alert, clinical_section_origin, clinical_discipline_origin, treatment_service_origin, clinical_section_destination, clinical_discipline_destination, treatment_service_destination, notes_and_special_indications, status, accepted_by, accepted_by_user_id, accepted_at, referral_status, is_featured, created_at)
VALUES ('aaaa3333-3333-3333-3333-333333333333', '2026-00091', 'Corrective Orthodontics', 15, 'None', 'OP', 'Pediatric Dentistry', 'Space Maintainer', 'Ortho', 'Corrective Orthodontics', 'Corrective Orthodontics', 'Transitioning from pedo to ortho care', 'approved', 'Sarah Lopez', 'bbbb3333-3333-3333-3333-333333333333', '2026-04-18T10:00:00Z', 'ongoing', true, '2026-04-15T08:00:00Z');

-- V13. Ortho → OM, Sarah, NOT accepted, PENDING (Apr 2026)
INSERT INTO referrals (user_id, chart_number, treatment, age, medical_alert, clinical_section_origin, clinical_discipline_origin, treatment_service_origin, clinical_section_destination, clinical_discipline_destination, treatment_service_destination, notes_and_special_indications, status, accepted_by, referral_status, is_featured, created_at)
VALUES ('bbbb3333-3333-3333-3333-333333333333', '2026-00092', 'Flap Surgery', 44, 'Hypertension', 'Ortho', 'Corrective Orthodontics', 'Corrective Orthodontics', 'OM', 'Oral Surgery', 'Flap Surgery', 'Post-ortho periodontal surgery needed', 'pending', 'None', 'ongoing', false, '2026-04-22T08:00:00Z');

-- V14. Ortho → Prostho, Carlos, accepted by Miguel, COMPLETED (Apr 2026)
INSERT INTO referrals (user_id, chart_number, treatment, age, medical_alert, clinical_section_origin, clinical_discipline_origin, treatment_service_origin, clinical_section_destination, clinical_discipline_destination, treatment_service_destination, notes_and_special_indications, status, accepted_by, accepted_by_user_id, accepted_at, referral_status, referral_status_changed_at, is_featured, created_at)
VALUES ('aaaa1111-1111-1111-1111-111111111111', '2026-00093', 'Removable Partial Dentures', 22, 'None', 'Ortho', 'Corrective Orthodontics', 'Corrective Orthodontics', 'Prostho', 'Prosthodontics', 'Removable Partial Dentures - Removable Partial Dentures', 'Post-ortho prosthetic needed', 'approved', 'Miguel Tan', 'bbbb2222-2222-2222-2222-222222222222', '2026-04-26T09:00:00Z', 'completed', '2026-04-30T12:00:00Z', true, '2026-04-24T08:00:00Z');

-- V15. Prostho → OM, Anna, accepted by Maria Clara, COMPLETED (Apr 2026), re-referred
INSERT INTO referrals (user_id, chart_number, treatment, age, medical_alert, clinical_section_origin, clinical_discipline_origin, treatment_service_origin, clinical_section_destination, clinical_discipline_destination, treatment_service_destination, notes_and_special_indications, status, accepted_by, accepted_by_user_id, accepted_at, referral_status, referral_status_changed_at, rerefer_request_status, rerefer_request_reason, is_featured, created_at)
VALUES ('bbbb1111-1111-1111-1111-111111111111', '2026-00094', 'Root Canal Treatment', 51, 'Diabetes', 'Prostho', 'Prosthodontics', 'Complete Dentures', 'OM', 'Endodontics', 'Root Canal Treatment', 'Pre-prosthetic endo — patient re-referred due to schedule conflict', 'approved', 'Maria Clara Reyes', 'aaaa2222-2222-2222-2222-222222222222', '2026-04-28T10:00:00Z', 'completed', '2026-04-30T16:00:00Z', 'approved', 'Patient schedule conflict', true, '2026-04-25T08:00:00Z');

-- ═══════════════════════════════════════════════════════════════════════════
-- RECENT REFERRALS — within 7 days of May 1 2026 (Apr 25 – May 1)
-- Ensures the "7 Days" filter shows data across all sections
-- ═══════════════════════════════════════════════════════════════════════════

-- R1. OM → OP, Carlos, accepted by Sarah, ONGOING (Apr 25)
INSERT INTO referrals (user_id, chart_number, treatment, age, medical_alert, clinical_section_origin, clinical_discipline_origin, treatment_service_origin, clinical_section_destination, clinical_discipline_destination, treatment_service_destination, notes_and_special_indications, status, accepted_by, accepted_by_user_id, accepted_at, referral_status, is_featured, created_at)
VALUES ('aaaa1111-1111-1111-1111-111111111111', '2026-00100', 'Composite Restoration', 27, 'None', 'OM', 'Oral Diagnosis', 'Oral Diagnosis', 'OP', 'Restorative Dentistry', 'Composite Restoration', 'Post-scaling restoration needed', 'approved', 'Sarah Lopez', 'bbbb3333-3333-3333-3333-333333333333', '2026-04-26T09:00:00Z', 'ongoing', true, '2026-04-25T08:00:00Z');

-- R2. Ortho → OM, Anna, accepted by Jose, ONGOING (Apr 26)
INSERT INTO referrals (user_id, chart_number, treatment, age, medical_alert, clinical_section_origin, clinical_discipline_origin, treatment_service_origin, clinical_section_destination, clinical_discipline_destination, treatment_service_destination, notes_and_special_indications, status, accepted_by, accepted_by_user_id, accepted_at, referral_status, is_featured, created_at)
VALUES ('bbbb1111-1111-1111-1111-111111111111', '2026-00101', 'Extraction', 17, 'None', 'Ortho', 'Corrective Orthodontics', 'Corrective Orthodontics', 'OM', 'Oral Surgery', 'Extraction', 'Pre-ortho extraction #34', 'approved', 'Jose Garcia', 'aaaa3333-3333-3333-3333-333333333333', '2026-04-27T10:00:00Z', 'ongoing', true, '2026-04-26T08:00:00Z');

-- R3. OP → Prostho, Miguel, accepted by Carlos, ONGOING (Apr 27)
INSERT INTO referrals (user_id, chart_number, treatment, age, medical_alert, clinical_section_origin, clinical_discipline_origin, treatment_service_origin, clinical_section_destination, clinical_discipline_destination, treatment_service_destination, notes_and_special_indications, status, accepted_by, accepted_by_user_id, accepted_at, referral_status, is_featured, created_at)
VALUES ('bbbb2222-2222-2222-2222-222222222222', '2026-00102', 'Complete Dentures', 65, 'Hypertension', 'OP', 'Fixed Partial Dentures', 'Crown', 'Prostho', 'Prosthodontics', 'Complete Dentures', 'Post-FPD full prosthetic plan', 'approved', 'Carlos Santos', 'aaaa1111-1111-1111-1111-111111111111', '2026-04-28T09:00:00Z', 'ongoing', true, '2026-04-27T08:00:00Z');

-- R4. OM → Ortho, Maria Clara, NOT accepted, PENDING (Apr 28)
INSERT INTO referrals (user_id, chart_number, treatment, age, medical_alert, clinical_section_origin, clinical_discipline_origin, treatment_service_origin, clinical_section_destination, clinical_discipline_destination, treatment_service_destination, notes_and_special_indications, status, accepted_by, referral_status, is_featured, created_at)
VALUES ('aaaa2222-2222-2222-2222-222222222222', '2026-00103', 'Corrective Orthodontics', 12, 'None', 'OM', 'Oral Diagnosis', 'Oral Diagnosis', 'Ortho', 'Corrective Orthodontics', 'Corrective Orthodontics', 'Malocclusion detected during screening', 'pending', 'None', 'ongoing', false, '2026-04-28T08:00:00Z');

-- R5. Prostho → OM, Jose, accepted by Anna, ONGOING (Apr 29)
INSERT INTO referrals (user_id, chart_number, treatment, age, medical_alert, clinical_section_origin, clinical_discipline_origin, treatment_service_origin, clinical_section_destination, clinical_discipline_destination, treatment_service_destination, notes_and_special_indications, status, accepted_by, accepted_by_user_id, accepted_at, referral_status, is_featured, created_at)
VALUES ('aaaa3333-3333-3333-3333-333333333333', '2026-00104', 'Extraction', 48, 'Diabetes', 'Prostho', 'Prosthodontics', 'Removable Partial Dentures - Removable Partial Dentures', 'OM', 'Oral Surgery', 'Extraction', 'Pre-prosthetic extraction #26', 'approved', 'Anna Mendoza', 'bbbb1111-1111-1111-1111-111111111111', '2026-04-30T09:00:00Z', 'ongoing', true, '2026-04-29T08:00:00Z');

-- R6. OM → Ortho, Sarah, accepted by Miguel, ONGOING (Apr 29)
INSERT INTO referrals (user_id, chart_number, treatment, age, medical_alert, clinical_section_origin, clinical_discipline_origin, treatment_service_origin, clinical_section_destination, clinical_discipline_destination, treatment_service_destination, notes_and_special_indications, status, accepted_by, accepted_by_user_id, accepted_at, referral_status, is_featured, created_at)
VALUES ('bbbb3333-3333-3333-3333-333333333333', '2026-00105', 'Corrective Orthodontics', 9, 'None', 'OM', 'Oral Diagnosis', 'Oral Diagnosis', 'Ortho', 'Corrective Orthodontics', 'Corrective Orthodontics', 'Early crossbite detected — urgent ortho', 'approved', 'Miguel Tan', 'bbbb2222-2222-2222-2222-222222222222', '2026-04-30T10:00:00Z', 'ongoing', true, '2026-04-29T08:30:00Z');

-- R7. OP → OM, Carlos, NOT accepted, PENDING (Apr 30)
INSERT INTO referrals (user_id, chart_number, treatment, age, medical_alert, clinical_section_origin, clinical_discipline_origin, treatment_service_origin, clinical_section_destination, clinical_discipline_destination, treatment_service_destination, notes_and_special_indications, status, accepted_by, referral_status, is_featured, created_at)
VALUES ('aaaa1111-1111-1111-1111-111111111111', '2026-00106', 'Scaling & Polishing', 37, 'Asthma', 'OP', 'Restorative Dentistry', 'Composite Restoration', 'OM', 'Periodontics', 'Scaling & Polishing', 'Pre-restorative perio clearance', 'pending', 'None', 'ongoing', false, '2026-04-30T08:00:00Z');

-- R8. Ortho → OP, Anna, accepted by Maria Clara, ONGOING (May 1)
INSERT INTO referrals (user_id, chart_number, treatment, age, medical_alert, clinical_section_origin, clinical_discipline_origin, treatment_service_origin, clinical_section_destination, clinical_discipline_destination, treatment_service_destination, notes_and_special_indications, status, accepted_by, accepted_by_user_id, accepted_at, referral_status, is_featured, created_at)
VALUES ('bbbb1111-1111-1111-1111-111111111111', '2026-00107', 'Pit & Fissure Sealant', 11, 'None', 'Ortho', 'Corrective Orthodontics', 'Corrective Orthodontics', 'OP', 'Pediatric Dentistry', 'Pedo Pit & Fissure Sealant', 'Ortho patient needs preventive sealants', 'approved', 'Maria Clara Reyes', 'aaaa2222-2222-2222-2222-222222222222', '2026-05-01T09:00:00Z', 'ongoing', true, '2026-05-01T07:30:00Z');

-- ═══════════════════════════════════════════════════════════════════════════
SELECT 'Seed data inserted! 6 advisees + 48 varied referrals (4 sections: OM, OP, Prostho, Ortho) + 1 clinical admin.' as message;
