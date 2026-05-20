-- ═══════════════════════════════════════════════════════════════════════════
-- Upcoming Schedule Seed — May 19 2026 onwards (UTC+08:00)
-- Users:
--   Nina Aurelio       — aaaa0000-0000-0000-0000-000000000006  (clinician)
--   Maria Clara Reyes  — aaaa0000-0000-0000-0000-000000000002  (clinician)
--   Clarisse Domingo   — cccc0000-0000-0000-0000-000000000001  (clinical_admin)
--   Roberto Aquino     — 55555555-5555-5555-5555-555555555555  (professor)
--
-- All events have is_favorite = TRUE so they appear in the header
-- Upcoming Schedule dropdown immediately.
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO events (user_id, title, description, start_time, end_time,
                   location, patient_name, color, notes, medical_alert,
                   is_favorite, status, source, created_at, updated_at)
VALUES

-- ─── Nina Aurelio ────────────────────────────────────────────────────────────
('aaaa0000-0000-0000-0000-000000000006',
 'Referral Appointment — Chart 2026-00042',
 'Composite restoration follow-up for referred patient.',
 '2026-05-20 09:00:00+08', '2026-05-20 10:00:00+08',
 'Clinic 3 — OP', 'Patient A', '#0EA5E9',
 '<p>Patient referred from OM for composite work on #16 and #17.</p>',
 'None', TRUE, 'scheduled', 'referral', NOW(), NOW()),

('aaaa0000-0000-0000-0000-000000000006',
 'Oral Diagnosis Rotation',
 'Morning OD rotation block.',
 '2026-05-21 08:00:00+08', '2026-05-21 12:00:00+08',
 'Clinic 1 — OD', NULL, '#6366F1',
 '<p>Assigned block for oral diagnosis screening rotation.</p>',
 'None', TRUE, 'scheduled', 'manual', NOW(), NOW()),

('aaaa0000-0000-0000-0000-000000000006',
 'Faculty Evaluation — Periodontics',
 'Year-level competency check by Prof Maria.',
 '2026-05-23 14:00:00+08', '2026-05-23 15:30:00+08',
 'Conference Room B', NULL, '#F59E0B',
 '<p>Bring updated requirements logbook.</p>',
 'None', TRUE, 'scheduled', 'manual', NOW(), NOW()),

('aaaa0000-0000-0000-0000-000000000006',
 'Referral Appointment — Chart 2026-00055',
 'Scaling & polishing for referred patient.',
 '2026-05-26 10:00:00+08', '2026-05-26 11:00:00+08',
 'Clinic 2 — Perio', 'Patient B', '#10B981',
 '<p>Routine scaling prior to prosthetic treatment.</p>',
 'Hypertensive', TRUE, 'scheduled', 'referral', NOW(), NOW()),

-- ─── Maria Clara Reyes ───────────────────────────────────────────────────────
('aaaa0000-0000-0000-0000-000000000002',
 'Referral Appointment — Chart 2026-00031',
 'Removable partial denture try-in appointment.',
 '2026-05-20 13:00:00+08', '2026-05-20 15:00:00+08',
 'Clinic 4 — Prostho', 'Patient C', '#8B5CF6',
 '<p>RPD framework try-in. Verify occlusal balance.</p>',
 'None', TRUE, 'scheduled', 'referral', NOW(), NOW()),

('aaaa0000-0000-0000-0000-000000000002',
 'Prostho Case Presentation',
 'Present complex denture case to Prof Imelda.',
 '2026-05-22 09:00:00+08', '2026-05-22 10:30:00+08',
 'Seminar Room 1', NULL, '#EC4899',
 '<p>Slide deck and case photos required.</p>',
 'None', TRUE, 'scheduled', 'manual', NOW(), NOW()),

('aaaa0000-0000-0000-0000-000000000002',
 'Referral Appointment — Chart 2026-00048',
 'Final denture delivery and insertion.',
 '2026-05-24 10:00:00+08', '2026-05-24 12:00:00+08',
 'Clinic 4 — Prostho', 'Patient D', '#8B5CF6',
 '<p>Deliver completed full upper denture. Post-insertion instructions.</p>',
 'Diabetic', TRUE, 'scheduled', 'referral', NOW(), NOW()),

('aaaa0000-0000-0000-0000-000000000002',
 'Requirements Review Meeting',
 'Requirements compliance review with batch coordinator.',
 '2026-05-27 15:00:00+08', '2026-05-27 16:00:00+08',
 'Faculty Room', NULL, '#F97316',
 '<p>Bring requirements checklist form.</p>',
 'None', TRUE, 'scheduled', 'manual', NOW(), NOW()),

-- ─── Clarisse Domingo (Clinical Admin) ───────────────────────────────────────
('cccc0000-0000-0000-0000-000000000001',
 'Clinic Operations Briefing',
 'Monthly briefing for all clinical staff on operations updates.',
 '2026-05-20 08:00:00+08', '2026-05-20 09:00:00+08',
 'Admin Conference Room', NULL, '#0EA5E9',
 '<p>Agenda: clinic schedule changes, equipment maintenance notice, referral volume report.</p>',
 'None', TRUE, 'scheduled', 'manual', NOW(), NOW()),

('cccc0000-0000-0000-0000-000000000001',
 'Referral Audit Review',
 'Review pending and overdue referrals with section heads.',
 '2026-05-21 10:00:00+08', '2026-05-21 12:00:00+08',
 'Admin Office', NULL, '#EF4444',
 '<p>Pull referral reports from system. Flag overdue items for escalation.</p>',
 'None', TRUE, 'scheduled', 'manual', NOW(), NOW()),

('cccc0000-0000-0000-0000-000000000001',
 'Supply & Equipment Coordination',
 'Coordination meeting with procurement for dental supply restocking.',
 '2026-05-23 09:00:00+08', '2026-05-23 10:00:00+08',
 'Procurement Office', NULL, '#10B981',
 '<p>Check inventory against minimum stock levels before end of month.</p>',
 'None', TRUE, 'scheduled', 'manual', NOW(), NOW()),

('cccc0000-0000-0000-0000-000000000001',
 'Student Records Processing',
 'Process batch clinical log submissions for accreditation.',
 '2026-05-26 13:00:00+08', '2026-05-26 17:00:00+08',
 'Admin Office', NULL, '#6366F1',
 '<p>Deadline: end of May. Encode all submitted logs into the accreditation tracker.</p>',
 'None', TRUE, 'scheduled', 'manual', NOW(), NOW()),

-- ─── Roberto Aquino (Professor / Clinical Chair) ──────────────────────────────
('55555555-5555-5555-5555-555555555555',
 'Advisee Clinic Supervision — Morning',
 'Supervise Ortho advisees during morning clinic block.',
 '2026-05-20 08:00:00+08', '2026-05-20 12:00:00+08',
 'Clinic 5 — Ortho', NULL, '#F59E0B',
 '<p>Check on Tristan, Ursula, and Victor cases. Sign off treatment records.</p>',
 'None', TRUE, 'scheduled', 'manual', NOW(), NOW()),

('55555555-5555-5555-5555-555555555555',
 'Faculty Senate Meeting',
 'Quarterly faculty senate — agenda: curriculum review, clinical hours policy.',
 '2026-05-21 14:00:00+08', '2026-05-21 16:00:00+08',
 'Faculty Hall', NULL, '#8B5CF6',
 '<p>Bring updated clinical hours proposal document.</p>',
 'None', TRUE, 'scheduled', 'manual', NOW(), NOW()),

('55555555-5555-5555-5555-555555555555',
 'Edit Request Review — Referrals',
 'Review and approve pending edit requests from advisees.',
 '2026-05-22 10:00:00+08', '2026-05-22 11:00:00+08',
 'Faculty Office', NULL, '#EF4444',
 '<p>Five pending edit requests as of last check. Target: resolve all by EOD.</p>',
 'None', TRUE, 'scheduled', 'manual', NOW(), NOW()),

('55555555-5555-5555-5555-555555555555',
 'Advisee Case Conference',
 'Monthly case conference with all 9 advisees under Prof Roberto.',
 '2026-05-24 13:00:00+08', '2026-05-24 15:00:00+08',
 'Seminar Room 2', NULL, '#0EA5E9',
 '<p>Each advisee presents one active case. Focus on complex Ortho referrals.</p>',
 'None', TRUE, 'scheduled', 'manual', NOW(), NOW()),

('55555555-5555-5555-5555-555555555555',
 'Department Head Coordination Meeting',
 'Interdepartmental sync on referral backlogs and status.',
 '2026-05-28 09:00:00+08', '2026-05-28 10:30:00+08',
 'Admin Conference Room', NULL, '#10B981',
 '<p>Coordinate with OM, OP, and Prostho heads on cross-section referral queues.</p>',
 'None', TRUE, 'scheduled', 'manual', NOW(), NOW());
