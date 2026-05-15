-- ═══════════════════════════════════════════════════════════════════════════
-- ADD STATUS_CHANGE_DECLINE_REASON COLUMN TO REFERRALS
-- ═══════════════════════════════════════════════════════════════════════════
-- Mirrors the existing edit_request_decline_reason / deletion_request_decline_reason
-- columns so that a professor or clinical admin can attach a written reason when
-- declining a Deferral or Blacklist (status change) request. The /request-status
-- page surfaces this reason to the acceptor who originally submitted the request.

ALTER TABLE referrals
  ADD COLUMN IF NOT EXISTS status_change_decline_reason TEXT;

-- Stores the professor who APPROVED a Deferral / Blacklist (status change)
-- request. Without this column the Status History timeline in the View
-- Details modal can only fall back to `accepted_by_user_id`, which
-- mis-attributes the Deferred / Blacklisted row to the acceptor instead of
-- the approving professor.
ALTER TABLE referrals
  ADD COLUMN IF NOT EXISTS status_change_approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
