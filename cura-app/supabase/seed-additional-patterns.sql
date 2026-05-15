-- ═══════════════════════════════════════════════════════════════════════════
-- CURA — ADDITIONAL ANALYTICS-PATTERN SEED
-- ───────────────────────────────────────────────────────────────────────────
-- Run AFTER seed-fresh.sql.  Adds (does NOT wipe):
--   • 1 new professor flagged as Clinical Chair (subrole='Clinical Chair')
--   • ~80 extra referrals engineered with per-professor signatures so the
--     analytics dashboards show clearly differentiated patterns:
--        Prof Maria  (OM)      → high completion rate, OM-Endo heavy,
--                                growing monthly trend Nov 2025 → May 2026
--        Prof Eduardo(OP)      → many pending/overdue, OP-Restorative heavy
--        Prof Imelda (Prostho) → Prostho-heavy, lots of deferred/blacklisted
--        Prof Roberto(Ortho)   → Ortho-heavy, many edit/deletion requests
--   • Clearly-labeled events for every professor and every advisee so the
--     adviser/advisee + Clinical Chair filters can be eyeballed instantly.
-- Re-running this file is safe: each block deletes its own previous output
-- (matched by the "[PATTERN-SEED]" marker in titles / chart numbers) before
-- inserting again.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 0. Idempotent reset of just this file's rows ──────────────────────────
DELETE FROM activity_logs WHERE description LIKE '%[PATTERN-SEED]%';
DELETE FROM event_status_history
  WHERE event_id IN (SELECT id FROM events WHERE title LIKE '%[PATTERN-SEED]%');
DELETE FROM event_overrides
  WHERE event_id IN (SELECT id FROM events WHERE title LIKE '%[PATTERN-SEED]%');
DELETE FROM events    WHERE title         LIKE '%[PATTERN-SEED]%';
DELETE FROM referrals WHERE chart_number  LIKE 'PS-%';
DELETE FROM profiles  WHERE id = '66666666-6666-6666-6666-666666666666';

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Clinical Chair professor (subrole='Clinical Chair' → sees ALL events)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO profiles (id, email, first_name, last_name, role, subrole, adviser_id,
                      year_level, clinical_department, batch_name, password, status,
                      failed_login_attempts, avatar_url) VALUES
('66666666-6666-6666-6666-666666666666','chair@example.com','Conrado','Hidalgo',
 'professor','Clinical Chair',NULL,NULL,'OM','Faculty','password','ACTIVE',0,NULL);

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. Pattern referrals — per-professor signatures
-- ═══════════════════════════════════════════════════════════════════════════
-- Helper procedure (lifted to top-level so DO blocks can call it).
CREATE OR REPLACE PROCEDURE pattern_seed_insert_ref(
  p_creator UUID, p_acceptor UUID,
  p_orig_section TEXT, p_orig_disc TEXT, p_orig_svc TEXT,
  p_dest_section TEXT, p_dest_disc TEXT, p_dest_svc TEXT, p_treatment TEXT,
  p_alert TEXT, p_special TEXT, p_history TEXT, p_notes TEXT,
  p_outcome TEXT,        -- 'completed','ongoing','deferred','blacklisted','pending'
  p_edit TEXT,           -- NULL or 'pending','approved','declined'
  p_rerefer TEXT,
  p_deletion TEXT,
  p_month_offset INT,
  p_day INT, p_hour INT,
  p_chart_seq INT
) LANGUAGE plpgsql AS $proc$
DECLARE
  v_creator_adv UUID; v_acceptor_name TEXT;
  v_chart TEXT; v_created TIMESTAMPTZ; v_accepted TIMESTAMPTZ;
  v_status_changed TIMESTAMPTZ;
  v_is_accepted BOOLEAN;
  v_referral_status TEXT; v_status_text TEXT;
BEGIN
  SELECT adviser_id INTO v_creator_adv FROM profiles WHERE id = p_creator;
  SELECT first_name || ' ' || last_name INTO v_acceptor_name
    FROM profiles WHERE id = p_acceptor;

  v_chart   := 'PS-' || lpad(p_chart_seq::text, 5, '0');
  v_created := (TIMESTAMPTZ '2025-11-01 00:00:00+00'
                + (p_month_offset || ' months')::interval
                + ((p_day - 1) || ' days')::interval
                + (p_hour || ' hours')::interval);

  v_is_accepted := (p_outcome <> 'pending');
  IF v_is_accepted THEN
    v_accepted := v_created + interval '2 days' + ((p_chart_seq % 6) || ' hours')::interval;
  ELSE
    v_accepted := NULL;
  END IF;

  v_referral_status := CASE p_outcome
    WHEN 'completed'    THEN 'completed'
    WHEN 'deferred'     THEN 'deferred'
    WHEN 'blacklisted'  THEN 'blacklisted'
    WHEN 'ongoing'      THEN 'ongoing'
    WHEN 'pending'      THEN 'ongoing'
  END;

  IF v_referral_status IN ('completed','deferred','blacklisted') THEN
    v_status_changed := v_accepted + interval '8 days';
  ELSE
    v_status_changed := NULL;
  END IF;

  v_status_text := CASE WHEN v_is_accepted THEN 'approved' ELSE 'pending' END;

  INSERT INTO referrals (
    user_id, chart_number, treatment, age, sex, medical_alert,
    clinical_section_origin, clinical_discipline_origin, treatment_service_origin,
    clinical_section_destination, clinical_discipline_destination, treatment_service_destination,
    special_case, medical_history, tentative_appointment_schedule, notes_and_special_indications,
    status, accepted_by, accepted_by_user_id, accepted_at,
    referral_status, referral_status_changed_at, is_featured,
    edit_request_reason, edit_request_status, edit_request_professor_ids,
    rerefer_request_reason, rerefer_request_status, rerefer_request_professor_ids,
    rerefer_requested_by, rerefer_requested_at,
    deletion_request_reason, deletion_request_status, deletion_request_professor_ids,
    deletion_requested_by, deletion_requested_at,
    created_at, updated_at
  ) VALUES (
    p_creator, v_chart, p_treatment, 18 + (p_chart_seq % 60),
    CASE WHEN p_chart_seq % 2 = 0 THEN 'Female' ELSE 'Male' END, p_alert,
    p_orig_section, p_orig_disc, p_orig_svc,
    p_dest_section, p_dest_disc, p_dest_svc,
    p_special, p_history, v_created + interval '14 days', p_notes,
    v_status_text,
    CASE WHEN v_is_accepted THEN v_acceptor_name ELSE 'None' END,
    CASE WHEN v_is_accepted THEN p_acceptor    ELSE NULL END,
    v_accepted,
    v_referral_status, v_status_changed, v_is_accepted,
    CASE WHEN p_edit IS NOT NULL THEN 'Pattern seed: please update treatment plan.' ELSE NULL END,
    p_edit,
    CASE WHEN p_edit IS NOT NULL AND v_creator_adv IS NOT NULL THEN ARRAY[v_creator_adv] ELSE NULL END,
    CASE WHEN p_rerefer IS NOT NULL THEN 'Pattern seed: re-refer due to schedule conflict.' ELSE NULL END,
    p_rerefer,
    CASE WHEN p_rerefer IS NOT NULL AND v_creator_adv IS NOT NULL THEN ARRAY[v_creator_adv] ELSE NULL END,
    CASE WHEN p_rerefer IS NOT NULL THEN p_creator ELSE NULL END,
    CASE WHEN p_rerefer IS NOT NULL THEN v_created + interval '4 days' ELSE NULL END,
    CASE WHEN p_deletion IS NOT NULL THEN 'Pattern seed: duplicate referral.' ELSE NULL END,
    p_deletion,
    CASE WHEN p_deletion IS NOT NULL AND v_creator_adv IS NOT NULL THEN ARRAY[v_creator_adv] ELSE NULL END,
    CASE WHEN p_deletion IS NOT NULL THEN p_creator ELSE NULL END,
    CASE WHEN p_deletion IS NOT NULL THEN v_created + interval '5 days' ELSE NULL END,
    v_created, v_created
  );
END;
$proc$;

DO $pattern_referrals$
DECLARE
  i INT := 0;
BEGIN
  -- ─── Prof Maria's advisees (a-prefix) ─────────────────────────────────
  -- Signature: OM-Endo + OM-Surgery heavy. HIGH completion rate (≈70%).
  -- Volume ramp: 2 in Nov-25, 3 in Dec, 4 in Jan, 5 in Feb, 6 in Mar, 7 in Apr.
  -- 27 referrals total.
  i := 0;
  -- Nov 2025 (offset 0): 2 — both completed
  i := i + 1; CALL pattern_seed_insert_ref('aaaa0000-0000-0000-0000-000000000001','aaaa0000-0000-0000-0000-000000000002','OP','Restorative Dentistry','Composite Restoration','OM','Endodontics','Root Canal Treatment','Root Canal Treatment','None',NULL,'No significant medical history.','RCT #36, mesiobuccal canal patent.','completed',NULL,NULL,NULL,0,3,9,100+i);
  i := i + 1; CALL pattern_seed_insert_ref('aaaa0000-0000-0000-0000-000000000003','aaaa0000-0000-0000-0000-000000000004','OM','Periodontics','Scaling & Polishing','OM','Oral Surgery','Extraction','Extraction','Hypertension',NULL,'Controlled hypertension on Losartan.','Tooth #38 extraction.','completed',NULL,NULL,NULL,0,15,10,100+i);
  -- Dec 2025 (1): 3 — 2 completed, 1 ongoing
  i := i + 1; CALL pattern_seed_insert_ref('aaaa0000-0000-0000-0000-000000000005','aaaa0000-0000-0000-0000-000000000006','OP','Restorative Dentistry','Composite Restoration','OM','Endodontics','Root Canal Treatment','Root Canal Treatment','None',NULL,'No medications.','RCT #46.','completed',NULL,NULL,NULL,1,4,8,100+i);
  i := i + 1; CALL pattern_seed_insert_ref('aaaa0000-0000-0000-0000-000000000007','aaaa0000-0000-0000-0000-000000000008','OM','Oral Diagnosis','Oral Diagnosis','OM','Endodontics','Root Canal Treatment','Root Canal Treatment','Diabetes',NULL,'Type 2 DM, HbA1c 6.8.','RCT #16, special considerations.','completed',NULL,NULL,NULL,1,12,11,100+i);
  i := i + 1; CALL pattern_seed_insert_ref('aaaa0000-0000-0000-0000-000000000009','aaaa0000-0000-0000-0000-000000000001','OP','Restorative Dentistry','Composite Restoration','OM','Periodontics','Scaling & Polishing','Scaling & Polishing','None',NULL,'Healthy patient.','Routine prophylaxis.','ongoing',NULL,NULL,NULL,1,20,14,100+i);
  -- Jan 2026 (2): 4 — 3 completed, 1 deferred
  i := i + 1; CALL pattern_seed_insert_ref('aaaa0000-0000-0000-0000-000000000002','aaaa0000-0000-0000-0000-000000000003','OP','Restorative Dentistry','Composite Restoration','OM','Endodontics','Root Canal Treatment','Root Canal Treatment','None',NULL,'NSR.','RCT #26.','completed',NULL,NULL,NULL,2,2,9,100+i);
  i := i + 1; CALL pattern_seed_insert_ref('aaaa0000-0000-0000-0000-000000000004','aaaa0000-0000-0000-0000-000000000005','OM','Oral Diagnosis','Oral Diagnosis','OM','Oral Surgery','Odontectomy','Odontectomy','None',NULL,'Healthy.','Impacted #48.','completed',NULL,NULL,NULL,2,8,10,100+i);
  i := i + 1; CALL pattern_seed_insert_ref('aaaa0000-0000-0000-0000-000000000006','aaaa0000-0000-0000-0000-000000000007','OP','Restorative Dentistry','Composite Restoration','OM','Endodontics','Root Canal Treatment','Root Canal Treatment','Asthma',NULL,'Salbutamol PRN.','RCT #14.','completed',NULL,NULL,NULL,2,15,13,100+i);
  i := i + 1; CALL pattern_seed_insert_ref('aaaa0000-0000-0000-0000-000000000008','aaaa0000-0000-0000-0000-000000000009','OP','Restorative Dentistry','Composite Restoration','OM','Periodontics','Non-Surgical Root Planing','Non-Surgical Root Planing','None','Senior Citizen','Mild generalized periodontitis.','SRP UR/UL quadrants.','deferred',NULL,NULL,NULL,2,24,11,100+i);
  -- Feb 2026 (3): 5 — 3 completed, 1 ongoing, 1 with edit-approved
  i := i + 1; CALL pattern_seed_insert_ref('aaaa0000-0000-0000-0000-000000000001','aaaa0000-0000-0000-0000-000000000003','OP','Restorative Dentistry','Composite Restoration','OM','Endodontics','Root Canal Treatment','Root Canal Treatment','None',NULL,'NSR.','RCT #36 retreatment.','completed',NULL,NULL,NULL,3,3,8,100+i);
  i := i + 1; CALL pattern_seed_insert_ref('aaaa0000-0000-0000-0000-000000000002','aaaa0000-0000-0000-0000-000000000004','OM','Oral Diagnosis','Oral Diagnosis','OM','Oral Surgery','Extraction','Extraction','Hypertension',NULL,'Stable.','Tooth #28.','completed','approved',NULL,NULL,3,9,10,100+i);
  i := i + 1; CALL pattern_seed_insert_ref('aaaa0000-0000-0000-0000-000000000005','aaaa0000-0000-0000-0000-000000000006','OP','Restorative Dentistry','Composite Restoration','OM','Endodontics','Root Canal Treatment','Root Canal Treatment','None',NULL,'NSR.','RCT #45.','completed',NULL,NULL,NULL,3,14,12,100+i);
  i := i + 1; CALL pattern_seed_insert_ref('aaaa0000-0000-0000-0000-000000000007','aaaa0000-0000-0000-0000-000000000008','OP','Restorative Dentistry','Composite Restoration','OM','Periodontics','Scaling & Polishing','Scaling & Polishing','None',NULL,'NSR.','Routine cleaning.','ongoing',NULL,NULL,NULL,3,19,9,100+i);
  i := i + 1; CALL pattern_seed_insert_ref('aaaa0000-0000-0000-0000-000000000009','aaaa0000-0000-0000-0000-000000000001','OP','Restorative Dentistry','Composite Restoration','OM','Oral Diagnosis','Special Case','Oral Cancer Screening','None','High Risk','Heavy smoker, 30 pack-yrs.','Suspicious lesion lateral border tongue.','completed',NULL,NULL,NULL,3,25,11,100+i);
  -- Mar 2026 (4): 6 — 4 completed, 1 ongoing, 1 with rerefer-approved
  i := i + 1; CALL pattern_seed_insert_ref('aaaa0000-0000-0000-0000-000000000003','aaaa0000-0000-0000-0000-000000000005','OP','Restorative Dentistry','Composite Restoration','OM','Endodontics','Root Canal Treatment','Root Canal Treatment','None',NULL,'NSR.','RCT #37.','completed',NULL,NULL,NULL,4,2,8,100+i);
  i := i + 1; CALL pattern_seed_insert_ref('aaaa0000-0000-0000-0000-000000000004','aaaa0000-0000-0000-0000-000000000006','OM','Oral Diagnosis','Oral Diagnosis','OM','Oral Surgery','Flap Surgery','Flap Surgery','Diabetes',NULL,'HbA1c 7.0.','Pericoronitis #48.','completed',NULL,NULL,NULL,4,7,10,100+i);
  i := i + 1; CALL pattern_seed_insert_ref('aaaa0000-0000-0000-0000-000000000006','aaaa0000-0000-0000-0000-000000000007','OP','Restorative Dentistry','Composite Restoration','OM','Endodontics','Root Canal Treatment','Root Canal Treatment','None',NULL,'NSR.','RCT #11.','completed',NULL,NULL,NULL,4,12,13,100+i);
  i := i + 1; CALL pattern_seed_insert_ref('aaaa0000-0000-0000-0000-000000000008','aaaa0000-0000-0000-0000-000000000009','OP','Restorative Dentistry','Composite Restoration','OM','Endodontics','Root Canal Treatment','Root Canal Treatment','None',NULL,'NSR.','RCT #21.','completed',NULL,NULL,NULL,4,17,9,100+i);
  i := i + 1; CALL pattern_seed_insert_ref('aaaa0000-0000-0000-0000-000000000001','aaaa0000-0000-0000-0000-000000000002','OM','Periodontics','Scaling & Polishing','OM','Periodontics','Non-Surgical Root Planing','Non-Surgical Root Planing','None',NULL,'Generalized chronic periodontitis.','Stage II SRP.','ongoing',NULL,NULL,NULL,4,22,11,100+i);
  i := i + 1; CALL pattern_seed_insert_ref('aaaa0000-0000-0000-0000-000000000003','aaaa0000-0000-0000-0000-000000000004','OM','Oral Diagnosis','Oral Diagnosis','OM','Oral Surgery','Odontectomy','Odontectomy','None',NULL,'NSR.','Impacted #38.','completed',NULL,'approved',NULL,4,27,14,100+i);
  -- Apr 2026 (5): 7 — 5 completed, 1 ongoing, 1 pending(unaccepted)
  i := i + 1; CALL pattern_seed_insert_ref('aaaa0000-0000-0000-0000-000000000005','aaaa0000-0000-0000-0000-000000000007','OP','Restorative Dentistry','Composite Restoration','OM','Endodontics','Root Canal Treatment','Root Canal Treatment','None',NULL,'NSR.','RCT #25.','completed',NULL,NULL,NULL,5,1,8,100+i);
  i := i + 1; CALL pattern_seed_insert_ref('aaaa0000-0000-0000-0000-000000000006','aaaa0000-0000-0000-0000-000000000008','OP','Restorative Dentistry','Composite Restoration','OM','Endodontics','Root Canal Treatment','Root Canal Treatment','None',NULL,'NSR.','RCT #15.','completed',NULL,NULL,NULL,5,5,10,100+i);
  i := i + 1; CALL pattern_seed_insert_ref('aaaa0000-0000-0000-0000-000000000002','aaaa0000-0000-0000-0000-000000000009','OP','Restorative Dentistry','Composite Restoration','OM','Oral Surgery','Extraction','Extraction','None',NULL,'NSR.','Tooth #18.','completed',NULL,NULL,NULL,5,9,12,100+i);
  i := i + 1; CALL pattern_seed_insert_ref('aaaa0000-0000-0000-0000-000000000004','aaaa0000-0000-0000-0000-000000000001','OM','Oral Diagnosis','Oral Diagnosis','OM','Oral Surgery','Odontectomy','Odontectomy','Pregnancy',NULL,'2nd trimester. OB cleared.','Impacted #28.','completed',NULL,NULL,NULL,5,13,9,100+i);
  i := i + 1; CALL pattern_seed_insert_ref('aaaa0000-0000-0000-0000-000000000007','aaaa0000-0000-0000-0000-000000000003','OP','Restorative Dentistry','Composite Restoration','OM','Endodontics','Root Canal Treatment','Root Canal Treatment','None',NULL,'NSR.','RCT #46.','completed',NULL,NULL,NULL,5,17,11,100+i);
  i := i + 1; CALL pattern_seed_insert_ref('aaaa0000-0000-0000-0000-000000000009','aaaa0000-0000-0000-0000-000000000005','OP','Restorative Dentistry','Composite Restoration','OM','Periodontics','Scaling & Polishing','Scaling & Polishing','None',NULL,'NSR.','Routine.','ongoing',NULL,NULL,NULL,5,21,13,100+i);
  i := i + 1; CALL pattern_seed_insert_ref('aaaa0000-0000-0000-0000-000000000008','aaaa0000-0000-0000-0000-000000000001','OM','Periodontics','Scaling & Polishing','OM','Endodontics','Root Canal Treatment','Root Canal Treatment','None',NULL,'NSR.','RCT #34 — pending acceptance.','pending',NULL,NULL,NULL,5,25,15,100+i);

  -- ─── Prof Eduardo's advisees (b-prefix) ────────────────────────────────
  -- Signature: OP-Restorative + Pediatric heavy. LOW completion rate (≈30%),
  -- many PENDING/OVERDUE. Fairly flat monthly trend ≈4-5/month.
  i := 0;
  -- Nov 2025 (0): 4 — 1 completed, 2 pending(old → overdue), 1 ongoing
  i := i + 1; CALL pattern_seed_insert_ref('bbbb0000-0000-0000-0000-000000000001','bbbb0000-0000-0000-0000-000000000002','OM','Oral Diagnosis','Oral Diagnosis','OP','Restorative Dentistry','Composite Restoration','Composite Restoration','None',NULL,'NSR.','Class II #36.','completed',NULL,NULL,NULL,0,5,9,200+i);
  i := i + 1; CALL pattern_seed_insert_ref('bbbb0000-0000-0000-0000-000000000003','bbbb0000-0000-0000-0000-000000000004','OM','Oral Diagnosis','Oral Diagnosis','OP','Restorative Dentistry','Glass Ionomer Restoration','Glass Ionomer Restoration','None','Pediatric','5yo cooperative.','GIC #84.','pending',NULL,NULL,NULL,0,12,10,200+i);
  i := i + 1; CALL pattern_seed_insert_ref('bbbb0000-0000-0000-0000-000000000005','bbbb0000-0000-0000-0000-000000000006','OM','Oral Diagnosis','Oral Diagnosis','OP','Pediatric Dentistry','Pedo Restoration','Pedo Restoration','None','Pediatric','7yo, MIH lesions.','Pedo restoration #75.','pending',NULL,NULL,NULL,0,18,13,200+i);
  i := i + 1; CALL pattern_seed_insert_ref('bbbb0000-0000-0000-0000-000000000007','bbbb0000-0000-0000-0000-000000000008','OM','Oral Diagnosis','Oral Diagnosis','OP','Restorative Dentistry','Pit & Fissure Sealant','Pit & Fissure Sealant','None','Pediatric','9yo healthy.','Sealants #16,26,36,46.','ongoing',NULL,NULL,NULL,0,23,11,200+i);
  -- Dec 2025 (1): 5 — 1 completed, 2 pending, 1 ongoing, 1 deferred
  i := i + 1; CALL pattern_seed_insert_ref('bbbb0000-0000-0000-0000-000000000009','bbbb0000-0000-0000-0000-000000000001','OM','Oral Diagnosis','Oral Diagnosis','OP','Restorative Dentistry','Composite Restoration','Composite Restoration','Hypertension',NULL,'Controlled.','Class III #11.','completed',NULL,NULL,NULL,1,3,8,200+i);
  i := i + 1; CALL pattern_seed_insert_ref('bbbb0000-0000-0000-0000-000000000002','bbbb0000-0000-0000-0000-000000000003','OM','Oral Diagnosis','Oral Diagnosis','OP','Pediatric Dentistry','Pedo Pulp Therapy','Pedo Pulp Therapy','None','Pediatric','6yo non-cooperative.','Pulpotomy #74.','pending',NULL,NULL,NULL,1,9,10,200+i);
  i := i + 1; CALL pattern_seed_insert_ref('bbbb0000-0000-0000-0000-000000000004','bbbb0000-0000-0000-0000-000000000005','OM','Oral Diagnosis','Oral Diagnosis','OP','Restorative Dentistry','Composite Restoration','Composite Restoration','None',NULL,'NSR.','Class V #23.','pending',NULL,NULL,NULL,1,14,12,200+i);
  i := i + 1; CALL pattern_seed_insert_ref('bbbb0000-0000-0000-0000-000000000006','bbbb0000-0000-0000-0000-000000000007','OM','Oral Diagnosis','Oral Diagnosis','OP','Restorative Dentistry','Direct Onlay','Direct Onlay','None',NULL,'NSR.','Onlay #36.','ongoing',NULL,NULL,NULL,1,19,9,200+i);
  i := i + 1; CALL pattern_seed_insert_ref('bbbb0000-0000-0000-0000-000000000008','bbbb0000-0000-0000-0000-000000000009','OM','Periodontics','Scaling & Polishing','OP','Pediatric Dentistry','Space Maintainer','Space Maintainer','None','Pediatric','8yo lost #75 early.','Band & loop.','deferred',NULL,NULL,NULL,1,26,11,200+i);
  -- Jan 2026 (2): 4 — 1 completed, 2 pending, 1 ongoing
  i := i + 1; CALL pattern_seed_insert_ref('bbbb0000-0000-0000-0000-000000000001','bbbb0000-0000-0000-0000-000000000004','OM','Oral Diagnosis','Oral Diagnosis','OP','Restorative Dentistry','Composite Restoration','Composite Restoration','Allergy: Penicillin',NULL,'Allergic to penicillin.','Class II #46.','completed',NULL,NULL,NULL,2,4,8,200+i);
  i := i + 1; CALL pattern_seed_insert_ref('bbbb0000-0000-0000-0000-000000000003','bbbb0000-0000-0000-0000-000000000006','OM','Oral Diagnosis','Oral Diagnosis','OP','Restorative Dentistry','Glass Ionomer Restoration','Glass Ionomer Restoration','None','Pediatric','7yo, ECC.','Multiple GIC restorations.','pending','pending',NULL,NULL,2,11,10,200+i);
  i := i + 1; CALL pattern_seed_insert_ref('bbbb0000-0000-0000-0000-000000000005','bbbb0000-0000-0000-0000-000000000008','OM','Oral Diagnosis','Oral Diagnosis','OP','Restorative Dentistry','Composite Restoration','Composite Restoration','None',NULL,'NSR.','Class IV #21.','pending',NULL,NULL,NULL,2,17,12,200+i);
  i := i + 1; CALL pattern_seed_insert_ref('bbbb0000-0000-0000-0000-000000000007','bbbb0000-0000-0000-0000-000000000002','OM','Oral Diagnosis','Oral Diagnosis','OP','Pediatric Dentistry','Pedo Restoration','Pedo Restoration','None','Pediatric','5yo cooperative.','SSC #85.','ongoing',NULL,NULL,NULL,2,22,9,200+i);
  -- Feb 2026 (3): 5 — 1 completed, 2 pending, 1 ongoing, 1 blacklisted
  i := i + 1; CALL pattern_seed_insert_ref('bbbb0000-0000-0000-0000-000000000009','bbbb0000-0000-0000-0000-000000000003','OM','Oral Diagnosis','Oral Diagnosis','OP','Restorative Dentistry','Composite Restoration','Composite Restoration','None',NULL,'NSR.','Class I #36.','completed',NULL,NULL,NULL,3,2,8,200+i);
  i := i + 1; CALL pattern_seed_insert_ref('bbbb0000-0000-0000-0000-000000000002','bbbb0000-0000-0000-0000-000000000005','OM','Oral Diagnosis','Oral Diagnosis','OP','Restorative Dentistry','Direct Onlay','Direct Onlay','None',NULL,'NSR.','Onlay #46.','pending',NULL,NULL,NULL,3,8,10,200+i);
  i := i + 1; CALL pattern_seed_insert_ref('bbbb0000-0000-0000-0000-000000000004','bbbb0000-0000-0000-0000-000000000007','OM','Oral Diagnosis','Oral Diagnosis','OP','Pediatric Dentistry','Pedo Pulp Therapy','Pedo Pulp Therapy','None','Pediatric','7yo cooperative.','Pulpectomy #84.','pending',NULL,NULL,NULL,3,13,11,200+i);
  i := i + 1; CALL pattern_seed_insert_ref('bbbb0000-0000-0000-0000-000000000006','bbbb0000-0000-0000-0000-000000000009','OM','Oral Diagnosis','Oral Diagnosis','OP','Restorative Dentistry','Composite Restoration','Composite Restoration','None',NULL,'NSR.','Class II #45.','ongoing',NULL,NULL,NULL,3,18,13,200+i);
  i := i + 1; CALL pattern_seed_insert_ref('bbbb0000-0000-0000-0000-000000000008','bbbb0000-0000-0000-0000-000000000001','OP','Restorative Dentistry','Composite Restoration','OP','Restorative Dentistry','Composite Restoration','Composite Restoration','None','Medically Compromised','Multiple no-shows.','Repeated cancellation.','blacklisted',NULL,NULL,NULL,3,25,9,200+i);
  -- Mar 2026 (4): 4 — 1 completed, 2 pending(recent), 1 ongoing
  i := i + 1; CALL pattern_seed_insert_ref('bbbb0000-0000-0000-0000-000000000003','bbbb0000-0000-0000-0000-000000000005','OM','Oral Diagnosis','Oral Diagnosis','OP','Restorative Dentistry','Composite Restoration','Composite Restoration','None',NULL,'NSR.','Class II #15.','completed',NULL,NULL,NULL,4,5,10,200+i);
  i := i + 1; CALL pattern_seed_insert_ref('bbbb0000-0000-0000-0000-000000000005','bbbb0000-0000-0000-0000-000000000007','OM','Oral Diagnosis','Oral Diagnosis','OP','Restorative Dentistry','Pit & Fissure Sealant','Pit & Fissure Sealant','None','Pediatric','10yo healthy.','Sealants #46.','pending',NULL,NULL,NULL,4,11,12,200+i);
  i := i + 1; CALL pattern_seed_insert_ref('bbbb0000-0000-0000-0000-000000000007','bbbb0000-0000-0000-0000-000000000009','OM','Oral Diagnosis','Oral Diagnosis','OP','Pediatric Dentistry','Pedo Restoration','Pedo Restoration','None','Pediatric','6yo cooperative.','Pedo restoration #54.','pending',NULL,NULL,NULL,4,17,8,200+i);
  i := i + 1; CALL pattern_seed_insert_ref('bbbb0000-0000-0000-0000-000000000001','bbbb0000-0000-0000-0000-000000000003','OM','Oral Diagnosis','Oral Diagnosis','OP','Restorative Dentistry','Composite Restoration','Composite Restoration','None',NULL,'NSR.','Class III #22.','ongoing',NULL,NULL,NULL,4,24,11,200+i);
  -- Apr 2026 (5): 4 — 0 completed, 2 pending, 2 ongoing (lots of backlog)
  i := i + 1; CALL pattern_seed_insert_ref('bbbb0000-0000-0000-0000-000000000002','bbbb0000-0000-0000-0000-000000000004','OM','Oral Diagnosis','Oral Diagnosis','OP','Restorative Dentistry','Composite Restoration','Composite Restoration','None',NULL,'NSR.','Class V #34.','pending',NULL,NULL,NULL,5,3,9,200+i);
  i := i + 1; CALL pattern_seed_insert_ref('bbbb0000-0000-0000-0000-000000000004','bbbb0000-0000-0000-0000-000000000006','OM','Oral Diagnosis','Oral Diagnosis','OP','Restorative Dentistry','Glass Ionomer Restoration','Glass Ionomer Restoration','None','Pediatric','5yo, ECC.','GIC #85.','pending',NULL,NULL,NULL,5,9,11,200+i);
  i := i + 1; CALL pattern_seed_insert_ref('bbbb0000-0000-0000-0000-000000000006','bbbb0000-0000-0000-0000-000000000008','OM','Oral Diagnosis','Oral Diagnosis','OP','Pediatric Dentistry','Pedo Pulp Therapy','Pedo Pulp Therapy','None','Pediatric','7yo non-coop.','Pulpotomy #74.','ongoing',NULL,NULL,NULL,5,15,13,200+i);
  i := i + 1; CALL pattern_seed_insert_ref('bbbb0000-0000-0000-0000-000000000008','bbbb0000-0000-0000-0000-000000000001','OM','Oral Diagnosis','Oral Diagnosis','OP','Restorative Dentistry','Composite Restoration','Composite Restoration','None',NULL,'NSR.','Class II #16.','ongoing',NULL,NULL,NULL,5,21,10,200+i);

  -- ─── Prof Imelda's advisees (cafe-prefix) ──────────────────────────────
  -- Signature: Prostho heavy. MEDIUM completion (≈45%), MANY DEFERRED + BLACKLISTED.
  -- Volume: 3-4 per month, fairly flat.
  i := 0;
  -- Nov (0): 3 — 1 completed, 2 deferred
  i := i + 1; CALL pattern_seed_insert_ref('cafe0000-0000-0000-0000-000000000001','cafe0000-0000-0000-0000-000000000002','Prostho','Prosthodontics','Complete Dentures','Prostho','Prosthodontics','Complete Dentures','Complete Dentures','None','Senior Citizen','Edentulous, 72yo.','CD construction.','completed',NULL,NULL,NULL,0,4,9,300+i);
  i := i + 1; CALL pattern_seed_insert_ref('cafe0000-0000-0000-0000-000000000003','cafe0000-0000-0000-0000-000000000004','Prostho','Prosthodontics','Complete Dentures','Prostho','Prosthodontics','Removable Partial Dentures - Removable Partial Dentures','Removable Partial Dentures','Hypertension','Senior Citizen','Patient deferred — financial.','Kennedy Class II.','deferred',NULL,NULL,NULL,0,11,10,300+i);
  i := i + 1; CALL pattern_seed_insert_ref('cafe0000-0000-0000-0000-000000000005','cafe0000-0000-0000-0000-000000000006','Prostho','Prosthodontics','Complete Dentures','Prostho','Prosthodontics','Complete Dentures','Complete Dentures','Diabetes','Senior Citizen','Uncontrolled DM — postponed.','CD construction deferred.','deferred',NULL,NULL,NULL,0,19,12,300+i);
  -- Dec (1): 4 — 2 completed, 1 deferred, 1 blacklisted
  i := i + 1; CALL pattern_seed_insert_ref('cafe0000-0000-0000-0000-000000000007','cafe0000-0000-0000-0000-000000000008','OP','Restorative Dentistry','Composite Restoration','Prostho','Prosthodontics','Removable Partial Dentures - Removable Partial Dentures','Removable Partial Dentures','None',NULL,'NSR.','Kennedy I.','completed',NULL,NULL,NULL,1,5,8,300+i);
  i := i + 1; CALL pattern_seed_insert_ref('cafe0000-0000-0000-0000-000000000009','cafe0000-0000-0000-0000-000000000001','Prostho','Prosthodontics','Complete Dentures','Prostho','Prosthodontics','Complete Dentures','Complete Dentures','None','Senior Citizen','Healthy 68yo.','CD.','completed',NULL,NULL,NULL,1,12,11,300+i);
  i := i + 1; CALL pattern_seed_insert_ref('cafe0000-0000-0000-0000-000000000002','cafe0000-0000-0000-0000-000000000003','OP','Restorative Dentistry','Composite Restoration','Prostho','Prosthodontics','Removable Partial Dentures - Removable Partial Dentures','Removable Partial Dentures','Heart Condition','Senior Citizen','Cardiac stent 2023.','RPD deferred — cardiology clearance pending.','deferred',NULL,NULL,NULL,1,18,13,300+i);
  i := i + 1; CALL pattern_seed_insert_ref('cafe0000-0000-0000-0000-000000000004','cafe0000-0000-0000-0000-000000000005','OP','Restorative Dentistry','Composite Restoration','Prostho','Prosthodontics','Complete Dentures','Complete Dentures','None',NULL,'Multiple no-shows.','Patient blacklisted.','blacklisted',NULL,NULL,NULL,1,25,10,300+i);
  -- Jan (2): 4 — 2 completed, 1 deferred, 1 ongoing
  i := i + 1; CALL pattern_seed_insert_ref('cafe0000-0000-0000-0000-000000000006','cafe0000-0000-0000-0000-000000000007','OP','Fixed Partial Dentures','Crown','Prostho','Prosthodontics','Removable Partial Dentures - Removable Partial Dentures','Removable Partial Dentures','None',NULL,'NSR.','RPD UR.','completed',NULL,NULL,NULL,2,3,9,300+i);
  i := i + 1; CALL pattern_seed_insert_ref('cafe0000-0000-0000-0000-000000000008','cafe0000-0000-0000-0000-000000000009','OP','Restorative Dentistry','Composite Restoration','Prostho','Prosthodontics','Complete Dentures','Complete Dentures','None','Senior Citizen','Healthy 70yo.','CD.','completed',NULL,NULL,NULL,2,11,11,300+i);
  i := i + 1; CALL pattern_seed_insert_ref('cafe0000-0000-0000-0000-000000000001','cafe0000-0000-0000-0000-000000000003','Prostho','Prosthodontics','Complete Dentures','Prostho','Prosthodontics','Removable Partial Dentures - Removable Partial Dentures','Removable Partial Dentures','None','Senior Citizen','Financial constraints.','RPD deferred.','deferred',NULL,NULL,NULL,2,18,8,300+i);
  i := i + 1; CALL pattern_seed_insert_ref('cafe0000-0000-0000-0000-000000000004','cafe0000-0000-0000-0000-000000000006','OP','Restorative Dentistry','Composite Restoration','Prostho','Prosthodontics','Complete Dentures','Complete Dentures','None','Senior Citizen','NSR.','CD ongoing fittings.','ongoing',NULL,NULL,NULL,2,25,12,300+i);
  -- Feb (3): 4 — 1 completed, 2 deferred, 1 blacklisted
  i := i + 1; CALL pattern_seed_insert_ref('cafe0000-0000-0000-0000-000000000007','cafe0000-0000-0000-0000-000000000009','OP','Fixed Partial Dentures','Crown','Prostho','Prosthodontics','Complete Dentures','Complete Dentures','None','Senior Citizen','NSR.','CD.','completed',NULL,NULL,NULL,3,4,10,300+i);
  i := i + 1; CALL pattern_seed_insert_ref('cafe0000-0000-0000-0000-000000000002','cafe0000-0000-0000-0000-000000000005','OP','Restorative Dentistry','Composite Restoration','Prostho','Prosthodontics','Removable Partial Dentures - Removable Partial Dentures','Removable Partial Dentures','None',NULL,'Patient deferred — work conflict.','RPD deferred.','deferred',NULL,NULL,NULL,3,12,13,300+i);
  i := i + 1; CALL pattern_seed_insert_ref('cafe0000-0000-0000-0000-000000000003','cafe0000-0000-0000-0000-000000000008','Prostho','Prosthodontics','Complete Dentures','Prostho','Prosthodontics','Complete Dentures','Complete Dentures','Diabetes','Senior Citizen','Glycemic control issues.','CD deferred.','deferred',NULL,NULL,NULL,3,19,9,300+i);
  i := i + 1; CALL pattern_seed_insert_ref('cafe0000-0000-0000-0000-000000000006','cafe0000-0000-0000-0000-000000000001','OP','Restorative Dentistry','Composite Restoration','Prostho','Prosthodontics','Removable Partial Dentures - Removable Partial Dentures','Removable Partial Dentures','None',NULL,'Repeated cancellations.','Blacklisted.','blacklisted',NULL,NULL,'pending',3,26,11,300+i);
  -- Mar (4): 3 — 2 completed, 1 ongoing
  i := i + 1; CALL pattern_seed_insert_ref('cafe0000-0000-0000-0000-000000000009','cafe0000-0000-0000-0000-000000000004','Prostho','Prosthodontics','Complete Dentures','Prostho','Prosthodontics','Complete Dentures','Complete Dentures','None','Senior Citizen','Healthy 75yo.','CD.','completed',NULL,NULL,NULL,4,6,9,300+i);
  i := i + 1; CALL pattern_seed_insert_ref('cafe0000-0000-0000-0000-000000000005','cafe0000-0000-0000-0000-000000000007','OP','Fixed Partial Dentures','Crown','Prostho','Prosthodontics','Removable Partial Dentures - Removable Partial Dentures','Removable Partial Dentures','None',NULL,'NSR.','RPD LL.','completed',NULL,NULL,NULL,4,14,11,300+i);
  i := i + 1; CALL pattern_seed_insert_ref('cafe0000-0000-0000-0000-000000000008','cafe0000-0000-0000-0000-000000000002','OP','Restorative Dentistry','Composite Restoration','Prostho','Prosthodontics','Complete Dentures','Complete Dentures','None','Senior Citizen','NSR.','CD ongoing.','ongoing',NULL,NULL,NULL,4,22,13,300+i);
  -- Apr (5): 3 — 1 completed, 1 deferred, 1 ongoing
  i := i + 1; CALL pattern_seed_insert_ref('cafe0000-0000-0000-0000-000000000001','cafe0000-0000-0000-0000-000000000006','Prostho','Prosthodontics','Complete Dentures','Prostho','Prosthodontics','Complete Dentures','Complete Dentures','None','Senior Citizen','Healthy 71yo.','CD.','completed',NULL,NULL,NULL,5,4,10,300+i);
  i := i + 1; CALL pattern_seed_insert_ref('cafe0000-0000-0000-0000-000000000003','cafe0000-0000-0000-0000-000000000007','OP','Restorative Dentistry','Composite Restoration','Prostho','Prosthodontics','Removable Partial Dentures - Removable Partial Dentures','Removable Partial Dentures','Hypertension','Senior Citizen','Patient deferred.','RPD deferred.','deferred',NULL,NULL,NULL,5,12,9,300+i);
  i := i + 1; CALL pattern_seed_insert_ref('cafe0000-0000-0000-0000-000000000005','cafe0000-0000-0000-0000-000000000009','OP','Fixed Partial Dentures','Crown','Prostho','Prosthodontics','Complete Dentures','Complete Dentures','None','Senior Citizen','NSR.','CD ongoing.','ongoing',NULL,NULL,NULL,5,19,12,300+i);

  -- ─── Prof Roberto's advisees (dcba-prefix) ─────────────────────────────
  -- Signature: Ortho heavy. MANY EDIT REQUESTS + DELETION REQUESTS.
  -- Volume ramps DOWN: 5,4,4,3,3,2 over Nov→Apr.
  i := 0;
  -- Nov (0): 5 — 2 completed (1 with edit-approved), 1 ongoing,
  --         1 with edit-pending, 1 with deletion-pending
  i := i + 1; CALL pattern_seed_insert_ref('dcba0000-0000-0000-0000-000000000001','dcba0000-0000-0000-0000-000000000002','OP','Restorative Dentistry','Composite Restoration','Ortho','Corrective Orthodontics','Corrective Orthodontics','Corrective Orthodontics','None',NULL,'NSR. Class II Div 1.','MBT 0.022 begin.','completed',NULL,NULL,NULL,0,5,9,400+i);
  i := i + 1; CALL pattern_seed_insert_ref('dcba0000-0000-0000-0000-000000000003','dcba0000-0000-0000-0000-000000000004','OP','Restorative Dentistry','Composite Restoration','Ortho','Corrective Orthodontics','Corrective Orthodontics','Corrective Orthodontics','None',NULL,'NSR. Crowding upper.','Ortho phase 1.','completed','approved',NULL,NULL,0,12,10,400+i);
  i := i + 1; CALL pattern_seed_insert_ref('dcba0000-0000-0000-0000-000000000005','dcba0000-0000-0000-0000-000000000006','OP','Undergraduate Orthodontics','Preventive Orthodontics','Ortho','Corrective Orthodontics','Corrective Orthodontics','Corrective Orthodontics','None','Pediatric','9yo, anterior crossbite.','Begin treatment.','ongoing',NULL,NULL,NULL,0,18,12,400+i);
  i := i + 1; CALL pattern_seed_insert_ref('dcba0000-0000-0000-0000-000000000007','dcba0000-0000-0000-0000-000000000008','OP','Restorative Dentistry','Composite Restoration','Ortho','Corrective Orthodontics','Corrective Orthodontics','Corrective Orthodontics','None',NULL,'Wrong arch noted.','Need correction.','ongoing','pending',NULL,NULL,0,22,11,400+i);
  i := i + 1; CALL pattern_seed_insert_ref('dcba0000-0000-0000-0000-000000000009','dcba0000-0000-0000-0000-000000000001','OP','Restorative Dentistry','Composite Restoration','Ortho','Corrective Orthodontics','Corrective Orthodontics','Corrective Orthodontics','None',NULL,'Duplicate referral.','Submitted in error.','ongoing',NULL,NULL,'pending',0,27,13,400+i);
  -- Dec (1): 4 — 2 completed, 1 ongoing, 1 with edit-declined
  i := i + 1; CALL pattern_seed_insert_ref('dcba0000-0000-0000-0000-000000000002','dcba0000-0000-0000-0000-000000000003','OP','Restorative Dentistry','Composite Restoration','Ortho','Corrective Orthodontics','Corrective Orthodontics','Corrective Orthodontics','None',NULL,'NSR.','Ortho phase 2.','completed',NULL,NULL,NULL,1,3,9,400+i);
  i := i + 1; CALL pattern_seed_insert_ref('dcba0000-0000-0000-0000-000000000004','dcba0000-0000-0000-0000-000000000005','OP','Restorative Dentistry','Composite Restoration','Ortho','Corrective Orthodontics','Corrective Orthodontics','Corrective Orthodontics','None',NULL,'NSR.','MBT 0.022 finishing.','completed',NULL,NULL,NULL,1,11,11,400+i);
  i := i + 1; CALL pattern_seed_insert_ref('dcba0000-0000-0000-0000-000000000006','dcba0000-0000-0000-0000-000000000007','OP','Undergraduate Orthodontics','Interceptive Orthodontics','Ortho','Corrective Orthodontics','Corrective Orthodontics','Corrective Orthodontics','None','Pediatric','10yo, Class III tendency.','Phase 1 ongoing.','ongoing','declined',NULL,NULL,1,17,8,400+i);
  i := i + 1; CALL pattern_seed_insert_ref('dcba0000-0000-0000-0000-000000000008','dcba0000-0000-0000-0000-000000000009','OP','Restorative Dentistry','Composite Restoration','Ortho','Corrective Orthodontics','Corrective Orthodontics','Corrective Orthodontics','None',NULL,'NSR.','Begin ortho.','ongoing',NULL,NULL,NULL,1,24,10,400+i);
  -- Jan (2): 4 — 1 completed, 1 ongoing, 1 deletion-declined, 1 rerefer-pending
  i := i + 1; CALL pattern_seed_insert_ref('dcba0000-0000-0000-0000-000000000001','dcba0000-0000-0000-0000-000000000004','OP','Restorative Dentistry','Composite Restoration','Ortho','Corrective Orthodontics','Corrective Orthodontics','Corrective Orthodontics','None',NULL,'NSR.','Finishing.','completed',NULL,NULL,NULL,2,2,9,400+i);
  i := i + 1; CALL pattern_seed_insert_ref('dcba0000-0000-0000-0000-000000000003','dcba0000-0000-0000-0000-000000000006','OP','Restorative Dentistry','Composite Restoration','Ortho','Corrective Orthodontics','Corrective Orthodontics','Corrective Orthodontics','None',NULL,'NSR.','MBT begin.','ongoing',NULL,NULL,NULL,2,9,11,400+i);
  i := i + 1; CALL pattern_seed_insert_ref('dcba0000-0000-0000-0000-000000000005','dcba0000-0000-0000-0000-000000000008','OP','Undergraduate Orthodontics','Preventive Orthodontics','Ortho','Corrective Orthodontics','Corrective Orthodontics','Corrective Orthodontics','None','Pediatric','11yo, mild crowding.','Patient withdrew.','ongoing',NULL,NULL,'declined',2,16,12,400+i);
  i := i + 1; CALL pattern_seed_insert_ref('dcba0000-0000-0000-0000-000000000007','dcba0000-0000-0000-0000-000000000002','OP','Restorative Dentistry','Composite Restoration','Ortho','Corrective Orthodontics','Corrective Orthodontics','Corrective Orthodontics','None',NULL,'NSR.','Acceptor unavailable.','ongoing',NULL,'pending',NULL,2,23,8,400+i);
  -- Feb (3): 3 — 1 completed, 1 with rerefer-approved, 1 ongoing
  i := i + 1; CALL pattern_seed_insert_ref('dcba0000-0000-0000-0000-000000000009','dcba0000-0000-0000-0000-000000000003','OP','Restorative Dentistry','Composite Restoration','Ortho','Corrective Orthodontics','Corrective Orthodontics','Corrective Orthodontics','None',NULL,'NSR.','Phase 2 finishing.','completed',NULL,NULL,NULL,3,5,10,400+i);
  i := i + 1; CALL pattern_seed_insert_ref('dcba0000-0000-0000-0000-000000000002','dcba0000-0000-0000-0000-000000000005','OP','Restorative Dentistry','Composite Restoration','Ortho','Corrective Orthodontics','Corrective Orthodontics','Corrective Orthodontics','None',NULL,'Patient relocated.','Re-referred to partner clinic.','ongoing',NULL,'approved',NULL,3,13,11,400+i);
  i := i + 1; CALL pattern_seed_insert_ref('dcba0000-0000-0000-0000-000000000004','dcba0000-0000-0000-0000-000000000007','OP','Restorative Dentistry','Composite Restoration','Ortho','Corrective Orthodontics','Corrective Orthodontics','Corrective Orthodontics','None',NULL,'NSR.','MBT begin.','ongoing',NULL,NULL,NULL,3,21,9,400+i);
  -- Mar (4): 3 — 1 completed (edit-approved), 1 ongoing, 1 deletion-pending
  i := i + 1; CALL pattern_seed_insert_ref('dcba0000-0000-0000-0000-000000000006','dcba0000-0000-0000-0000-000000000009','OP','Restorative Dentistry','Composite Restoration','Ortho','Corrective Orthodontics','Corrective Orthodontics','Corrective Orthodontics','None',NULL,'NSR.','Finished.','completed','approved',NULL,NULL,4,4,10,400+i);
  i := i + 1; CALL pattern_seed_insert_ref('dcba0000-0000-0000-0000-000000000008','dcba0000-0000-0000-0000-000000000001','OP','Restorative Dentistry','Composite Restoration','Ortho','Corrective Orthodontics','Corrective Orthodontics','Corrective Orthodontics','None',NULL,'NSR.','Phase 1 ongoing.','ongoing',NULL,NULL,NULL,4,15,12,400+i);
  i := i + 1; CALL pattern_seed_insert_ref('dcba0000-0000-0000-0000-000000000001','dcba0000-0000-0000-0000-000000000003','OP','Restorative Dentistry','Composite Restoration','Ortho','Corrective Orthodontics','Corrective Orthodontics','Corrective Orthodontics','None',NULL,'Created in error.','Pending deletion approval.','ongoing',NULL,NULL,'pending',4,23,8,400+i);
  -- Apr (5): 2 — 1 ongoing, 1 with edit-pending
  i := i + 1; CALL pattern_seed_insert_ref('dcba0000-0000-0000-0000-000000000005','dcba0000-0000-0000-0000-000000000007','OP','Undergraduate Orthodontics','Interceptive Orthodontics','Ortho','Corrective Orthodontics','Corrective Orthodontics','Corrective Orthodontics','None','Pediatric','9yo, deep bite.','Phase 1 begun.','ongoing',NULL,NULL,NULL,5,7,11,400+i);
  i := i + 1; CALL pattern_seed_insert_ref('dcba0000-0000-0000-0000-000000000002','dcba0000-0000-0000-0000-000000000004','OP','Restorative Dentistry','Composite Restoration','Ortho','Corrective Orthodontics','Corrective Orthodontics','Corrective Orthodontics','None',NULL,'Need to update treatment plan.','Pending update.','ongoing','pending',NULL,NULL,5,18,9,400+i);
END;
$pattern_referrals$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. Pattern events — clearly tagged for visual filter validation
-- ═══════════════════════════════════════════════════════════════════════════
-- All titles include "[PATTERN-SEED]" + the OWNER tag, so when you log in
-- as a given role you can immediately see which events should and shouldn't
-- appear.
--
--  • Login as prof1 (Maria)            → sees "[PATTERN-SEED][Prof Maria]…"
--                                         AND every event tagged
--                                         "[PATTERN-SEED][Advisee a*]…".
--                                         Should NOT see Prof Eduardo's,
--                                         Imelda's, Roberto's, or their
--                                         advisees' events.
--  • Login as Conrado (Clinical Chair) → sees ALL [PATTERN-SEED] events
--                                         from every professor + advisee.
--  • Login as admin1 (clinical_admin)  → sees ALL [PATTERN-SEED] events
--                                         (clinical-admin sees everything).
--  • Login as a clinician (e.g. Carlos)→ sees only their own
--                                         "[PATTERN-SEED][Advisee aaaa…1]"
--                                         events.
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO events (user_id, title, description, start_time, end_time,
                    location, patient_name, color, notes, medical_alert,
                    is_favorite, status, created_at, updated_at)
VALUES
-- ─── Professors' own events ────────────────────────────────────────────
('22222222-2222-2222-2222-222222222222','[PATTERN-SEED][Prof Maria] Faculty Meeting','Weekly OM faculty briefing','2026-05-11 09:00:00+00','2026-05-11 10:00:00+00','Conference Room A',NULL,'#5B8AB8','<p>OM section weekly briefing.</p>','None',FALSE,'scheduled',NOW(),NOW()),
('22222222-2222-2222-2222-222222222222','[PATTERN-SEED][Prof Maria] Case Review','Review advisee cases','2026-05-13 14:00:00+00','2026-05-13 15:30:00+00','Office 2A',NULL,'#5B8AB8','<p>Review pending advisee cases.</p>','None',TRUE,'scheduled',NOW(),NOW()),
('33333333-3333-3333-3333-333333333333','[PATTERN-SEED][Prof Eduardo] Faculty Meeting','Weekly OP faculty briefing','2026-05-11 11:00:00+00','2026-05-11 12:00:00+00','Conference Room B',NULL,'#22C55E','<p>OP section weekly briefing.</p>','None',FALSE,'scheduled',NOW(),NOW()),
('33333333-3333-3333-3333-333333333333','[PATTERN-SEED][Prof Eduardo] Advisee Consultation','Consultation hours','2026-05-12 13:00:00+00','2026-05-12 15:00:00+00','Office 2B',NULL,'#22C55E','<p>Open consultation block.</p>','None',FALSE,'scheduled',NOW(),NOW()),
('44444444-4444-4444-4444-444444444444','[PATTERN-SEED][Prof Imelda] Prostho Workshop','Hands-on RPD design','2026-05-13 09:00:00+00','2026-05-13 12:00:00+00','Skills Lab',NULL,'#F59E0B','<p>RPD design workshop.</p>','None',TRUE,'scheduled',NOW(),NOW()),
('44444444-4444-4444-4444-444444444444','[PATTERN-SEED][Prof Imelda] Case Discussion','Difficult cases','2026-05-15 14:00:00+00','2026-05-15 15:00:00+00','Office 3A',NULL,'#F59E0B','<p>Difficult case discussion.</p>','None',FALSE,'scheduled',NOW(),NOW()),
('55555555-5555-5555-5555-555555555555','[PATTERN-SEED][Prof Roberto] Ortho Lecture','Brackets & wires','2026-05-12 10:00:00+00','2026-05-12 11:30:00+00','Lecture Hall 1',NULL,'#A855F7','<p>Lecture on brackets and archwires.</p>','None',FALSE,'scheduled',NOW(),NOW()),
('55555555-5555-5555-5555-555555555555','[PATTERN-SEED][Prof Roberto] Records Review','Pending records','2026-05-14 13:00:00+00','2026-05-14 14:00:00+00','Office 3B',NULL,'#A855F7','<p>Review pending advisee records.</p>','None',FALSE,'scheduled',NOW(),NOW()),
-- Clinical Chair
('66666666-6666-6666-6666-666666666666','[PATTERN-SEED][Clinical Chair] All-Hands','Quarterly all-hands meeting','2026-05-11 15:00:00+00','2026-05-11 16:30:00+00','Auditorium',NULL,'#EF4444','<p>Quarterly all-hands.</p>','None',TRUE,'scheduled',NOW(),NOW()),
('66666666-6666-6666-6666-666666666666','[PATTERN-SEED][Clinical Chair] Strategy Session','Section heads','2026-05-14 10:00:00+00','2026-05-14 11:30:00+00','Boardroom',NULL,'#EF4444','<p>Strategy session with section heads.</p>','None',FALSE,'scheduled',NOW(),NOW()),
-- Clinical Admin (head)
('cccc0000-0000-0000-0000-000000000001','[PATTERN-SEED][Clinical Admin] Audit Block','Records audit','2026-05-13 11:00:00+00','2026-05-13 12:00:00+00','Records Office',NULL,'#0EA5E9','<p>Records audit.</p>','None',FALSE,'scheduled',NOW(),NOW()),

-- ─── Advisee events — tagged by adviser group (a/b/cafe/dcba prefix) ────
-- Prof Maria's advisees (a-prefix): 2 each for first 4
('aaaa0000-0000-0000-0000-000000000001','[PATTERN-SEED][Advisee Maria/Carlos] RCT Session','Patient session','2026-05-11 08:00:00+00','2026-05-11 10:00:00+00','OM Bay 1','Maria L. Santos','#5B8AB8','<p>RCT session 1.</p>','None',FALSE,'scheduled',NOW(),NOW()),
('aaaa0000-0000-0000-0000-000000000001','[PATTERN-SEED][Advisee Maria/Carlos] Follow-up','Follow-up','2026-05-13 08:00:00+00','2026-05-13 09:00:00+00','OM Bay 1','Maria L. Santos','#5B8AB8','<p>RCT session 2.</p>','None',FALSE,'scheduled',NOW(),NOW()),
('aaaa0000-0000-0000-0000-000000000002','[PATTERN-SEED][Advisee Maria/MariaClara] Extraction','Surgery','2026-05-12 09:00:00+00','2026-05-12 10:00:00+00','OM Bay 2','John Rivera','#5B8AB8','<p>Tooth #38 extraction.</p>','Hypertension',FALSE,'scheduled',NOW(),NOW()),
('aaaa0000-0000-0000-0000-000000000003','[PATTERN-SEED][Advisee Maria/Jose] Prophy','Cleaning','2026-05-12 14:00:00+00','2026-05-12 15:00:00+00','OM Bay 3','Carla Reyes','#5B8AB8','<p>Routine prophylaxis.</p>','None',FALSE,'scheduled',NOW(),NOW()),
('aaaa0000-0000-0000-0000-000000000004','[PATTERN-SEED][Advisee Maria/Liza] RCT Session','Patient session','2026-05-14 08:00:00+00','2026-05-14 10:00:00+00','OM Bay 4','Pedro Cruz','#5B8AB8','<p>RCT #46.</p>','None',FALSE,'scheduled',NOW(),NOW()),

-- Prof Eduardo's advisees (b-prefix)
('bbbb0000-0000-0000-0000-000000000001','[PATTERN-SEED][Advisee Eduardo/Anna] Composite','Restoration','2026-05-11 09:00:00+00','2026-05-11 10:30:00+00','OP Bay 1','Angelica Lim','#22C55E','<p>Class II composite #36.</p>','None',FALSE,'scheduled',NOW(),NOW()),
('bbbb0000-0000-0000-0000-000000000001','[PATTERN-SEED][Advisee Eduardo/Anna] Recall','Recall','2026-05-15 09:00:00+00','2026-05-15 09:30:00+00','OP Bay 1','Angelica Lim','#22C55E','<p>6-mo recall.</p>','None',FALSE,'scheduled',NOW(),NOW()),
('bbbb0000-0000-0000-0000-000000000002','[PATTERN-SEED][Advisee Eduardo/Miguel] Onlay','Indirect onlay','2026-05-12 10:00:00+00','2026-05-12 12:00:00+00','OP Bay 2','Ramon Tan','#22C55E','<p>Onlay #36 try-in.</p>','None',FALSE,'scheduled',NOW(),NOW()),
('bbbb0000-0000-0000-0000-000000000003','[PATTERN-SEED][Advisee Eduardo/Sarah] Pedo','Pediatric','2026-05-13 13:00:00+00','2026-05-13 14:00:00+00','OP Bay 4','Sofia Garcia','#22C55E','<p>Pedo restoration #75.</p>','None',FALSE,'scheduled',NOW(),NOW()),
('bbbb0000-0000-0000-0000-000000000004','[PATTERN-SEED][Advisee Eduardo/Daniel] Sealants','Sealants','2026-05-14 14:00:00+00','2026-05-14 15:00:00+00','OP Bay 3','Diego Mendoza','#22C55E','<p>Sealants #16,26,36,46.</p>','None',FALSE,'scheduled',NOW(),NOW()),

-- Prof Imelda's advisees (cafe-prefix)
('cafe0000-0000-0000-0000-000000000001','[PATTERN-SEED][Advisee Imelda/Jenny] CD Try-In','Complete denture','2026-05-11 09:00:00+00','2026-05-11 11:00:00+00','Prostho Bay 1','Beatrice Ocampo','#F59E0B','<p>CD wax try-in.</p>','None',TRUE,'scheduled',NOW(),NOW()),
('cafe0000-0000-0000-0000-000000000002','[PATTERN-SEED][Advisee Imelda/Kevin] RPD','RPD adjustment','2026-05-12 13:00:00+00','2026-05-12 14:00:00+00','Prostho Bay 2','Hector Yu','#F59E0B','<p>RPD adjustment.</p>','None',FALSE,'scheduled',NOW(),NOW()),
('cafe0000-0000-0000-0000-000000000003','[PATTERN-SEED][Advisee Imelda/Lara] CD Insertion','Insertion','2026-05-13 09:00:00+00','2026-05-13 10:30:00+00','Prostho Bay 3','Group Session — N/A','#F59E0B','<p>CD insertion.</p>','Diabetes',FALSE,'scheduled',NOW(),NOW()),
('cafe0000-0000-0000-0000-000000000004','[PATTERN-SEED][Advisee Imelda/Mark] RPD Try-In','Try-in','2026-05-14 13:00:00+00','2026-05-14 14:30:00+00','Prostho Bay 1','—','#F59E0B','<p>RPD framework try-in.</p>','None',FALSE,'scheduled',NOW(),NOW()),

-- Prof Roberto's advisees (dcba-prefix)
('dcba0000-0000-0000-0000-000000000001','[PATTERN-SEED][Advisee Roberto/Tristan] Bonding','Bracket bonding','2026-05-11 10:00:00+00','2026-05-11 12:00:00+00','Ortho Bay 1','Maria L. Santos','#A855F7','<p>Initial bonding upper arch.</p>','None',FALSE,'scheduled',NOW(),NOW()),
('dcba0000-0000-0000-0000-000000000002','[PATTERN-SEED][Advisee Roberto/Ursula] Adjustment','Wire change','2026-05-12 11:00:00+00','2026-05-12 12:00:00+00','Ortho Bay 2','John Rivera','#A855F7','<p>Wire change to 0.018 NiTi.</p>','None',FALSE,'scheduled',NOW(),NOW()),
('dcba0000-0000-0000-0000-000000000003','[PATTERN-SEED][Advisee Roberto/Victor] Records','Records','2026-05-13 14:00:00+00','2026-05-13 15:00:00+00','Ortho Bay 1','Carla Reyes','#A855F7','<p>Pre-treatment records.</p>','None',FALSE,'scheduled',NOW(),NOW()),
('dcba0000-0000-0000-0000-000000000004','[PATTERN-SEED][Advisee Roberto/Wendy] Debond','Bracket removal','2026-05-15 13:00:00+00','2026-05-15 14:30:00+00','Ortho Bay 2','Pedro Cruz','#A855F7','<p>Debonding + retainer impressions.</p>','None',TRUE,'scheduled',NOW(),NOW()),

-- Unassigned clinicians — useful for testing "no adviser scope"
('ffff0000-0000-0000-0000-000000000001','[PATTERN-SEED][Unassigned/Test] Generic','Self-scheduled','2026-05-11 13:00:00+00','2026-05-11 14:00:00+00','Clinic Room 1',NULL,'#374151','<p>Self-scheduled block.</p>','None',FALSE,'scheduled',NOW(),NOW());

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. Activity logs for the pattern referrals (CREATE / ACCEPT / STATUS)
-- ═══════════════════════════════════════════════════════════════════════════
DO $pattern_logs$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id, user_id, accepted_by_user_id, accepted_by, chart_number,
                  created_at, accepted_at, referral_status, referral_status_changed_at
           FROM referrals WHERE chart_number LIKE 'PS-%' LOOP
    INSERT INTO activity_logs (user_id, action, description, metadata, created_at)
    VALUES (r.user_id, 'CREATE_REFERRAL',
            '[PATTERN-SEED] YOU CREATED A REFERRAL - Chart: ' || r.chart_number,
            jsonb_build_object('referral_id', r.id, 'chart_number', r.chart_number)::text,
            r.created_at);
    IF r.accepted_by_user_id IS NOT NULL THEN
      INSERT INTO activity_logs (user_id, action, description, metadata, created_at)
      VALUES (r.accepted_by_user_id, 'ACCEPT_REFERRAL',
              '[PATTERN-SEED] YOU HAVE ACCEPTED A REFERRAL - Chart: ' || r.chart_number,
              jsonb_build_object('referral_id', r.id, 'chart_number', r.chart_number, 'creator_id', r.user_id)::text,
              r.accepted_at);
      INSERT INTO activity_logs (user_id, action, description, metadata, created_at)
      VALUES (r.user_id, 'ACCEPT_REFERRAL',
              '[PATTERN-SEED] YOUR REFERRAL WAS ACCEPTED BY ' || r.accepted_by || ' - Chart: ' || r.chart_number,
              jsonb_build_object('referral_id', r.id, 'chart_number', r.chart_number)::text,
              r.accepted_at);
    END IF;
    IF r.referral_status_changed_at IS NOT NULL AND r.accepted_by_user_id IS NOT NULL THEN
      INSERT INTO activity_logs (user_id, action, description, metadata, created_at)
      VALUES (r.accepted_by_user_id, 'CHANGE_REFERRAL_STATUS',
              '[PATTERN-SEED] YOU CHANGED REFERRAL STATUS TO ' || upper(r.referral_status) || ' - Chart: ' || r.chart_number,
              jsonb_build_object('referral_id', r.id, 'new_status', r.referral_status)::text,
              r.referral_status_changed_at);
    END IF;
  END LOOP;
END;
$pattern_logs$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. Cleanup helper procedure & summary
-- ═══════════════════════════════════════════════════════════════════════════
DROP PROCEDURE IF EXISTS pattern_seed_insert_ref(
  UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT,
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT,
  INT, INT, INT, INT
);

SELECT
  (SELECT COUNT(*) FROM profiles WHERE id = '66666666-6666-6666-6666-666666666666') AS clinical_chair,
  (SELECT COUNT(*) FROM referrals WHERE chart_number LIKE 'PS-%')                    AS pattern_referrals,
  (SELECT COUNT(*) FROM events    WHERE title LIKE '%[PATTERN-SEED]%')              AS pattern_events,
  (SELECT COUNT(*) FROM activity_logs WHERE description LIKE '%[PATTERN-SEED]%')    AS pattern_logs;
