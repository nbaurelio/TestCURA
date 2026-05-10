# CURA System — Test Case Table

## Test Accounts

### Professors
| Account | Email | Role | ID | Advisees |
|---------|-------|------|----|----------|
| Prof Maria | prof1@example.com | professor | 22222222-... | Carlos Santos, Maria Clara Reyes, Jose Garcia |
| Prof 2 | prof2@example.com | professor | 33333333-... | Anna Mendoza, Miguel Tan, Sarah Lopez |

### Clinicians (Prof Maria's Advisees)
| Account | Email | ID | Department |
|---------|-------|----|------------|
| Carlos Santos | carlos@example.com | aaaa1111-... | OM |
| Maria Clara Reyes | maria.c@example.com | aaaa2222-... | Prostho |
| Jose Garcia | jose@example.com | aaaa3333-... | OP |

### Clinicians (Prof 2's Advisees)
| Account | Email | ID | Department |
|---------|-------|----|------------|
| Anna Mendoza | anna@example.com | bbbb1111-... | OP |
| Miguel Tan | miguel@example.com | bbbb2222-... | OM |
| Sarah Lopez | sarah@example.com | bbbb3333-... | Prostho |

### Other Clinicians
| Account | Email | ID |
|---------|-------|----|
| Test User | test@example.com | 00000000-... |
| Juan Dela Cruz | juan@example.com | 11111111-... |

---

## MODULE 1: Authentication & Login

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 1.1 | Login as clinician | Enter `carlos@example.com` → click Login | Redirected to `/home` | ☐ |
| 1.2 | Login as professor | Enter `prof1@example.com` → click Login | Redirected to `/professor` | ☐ |
| 1.3 | Login with invalid email | Enter `invalid@example.com` → click Login | Error message shown, stays on login page | ☐ |
| 1.4 | Route guard — clinician → professor page | Logged in as clinician, navigate to `/professor` | Access denied / redirected | ☐ |
| 1.5 | Route guard — professor → clinician page | Logged in as professor, navigate to `/home` | Access denied / redirected | ☐ |
| 1.6 | Logout | Click logout button in header | Redirected to login page, session cleared | ☐ |
| 1.7 | Switch accounts | Logout → Login as different user | Profile, referrals, and data reflect new user | ☐ |

---

## MODULE 2: Referral Creation (Clinician — `/home`)

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 2.1 | Open create referral modal | Click "+" or "Create Referral" button | Modal opens with New Patient / Existing Patient options | ☐ |
| 2.2 | Create referral — new patient | Fill all required fields (chart #, age, sections, treatment) → Submit | Referral created, appears in referral list | ☐ |
| 2.3 | Create referral — existing patient | Select existing chart number → Fill fields → Submit | Referral created with pre-filled data | ☐ |
| 2.4 | Create referral — missing required fields | Leave chart number empty → Submit | Validation error shown | ☐ |
| 2.5 | Create referral with special case | Fill form + select a special case → Submit | Referral created with special case badge visible | ☐ |
| 2.6 | Create referral with medical alert | Fill form + add medical alert → Submit | Referral shows medical alert indicator | ☐ |
| 2.7 | Duplicate chart number check | Create referral with same chart # as existing → Submit | Error: "Chart number exists" | ☐ |

---

## MODULE 3: Referral List & Filtering (Clinician — `/home`)

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 3.1 | View all referrals | Navigate to home page | All referrals listed | ☐ |
| 3.2 | Filter by clinical section | Select a section from dropdown | Only referrals matching that section shown | ☐ |
| 3.3 | Filter by discipline | Select section → select discipline | Referrals narrowed by discipline | ☐ |
| 3.4 | Filter by treatment service | Select section → discipline → treatment | Referrals narrowed by treatment service | ☐ |
| 3.5 | Filter by special case | Select a special case filter | Only matching referrals shown | ☐ |
| 3.6 | Search referrals (header) | Type keyword in header search bar | Referrals matching search shown | ☐ |
| 3.7 | Filter by medical alert (header) | Select medical alert filter in header | Only referrals with that alert shown | ☐ |
| 3.8 | Featured referrals carousel | Check carousel at top of page | Shows accepted/featured referrals, auto-rotates | ☐ |
| 3.9 | Accept a referral | Click Accept on a non-accepted referral → Confirm | Referral accepted: `accepted_by` = current user, `referral_status` = ongoing, `is_featured` = true | ☐ |
| 3.10 | Cannot accept own referral | Create a referral → Try to accept it | Accept button not shown on own referrals, or prevented | ☐ |
| 3.11 | Delete own referral | Click Delete on own referral → Confirm | Referral removed from list | ☐ |
| 3.12 | Submit edit request | Click Update on accepted referral → Enter reason → Submit | `edit_request_status` = "pending", `edit_request_reason` set | ☐ |
| 3.13 | Update referral after edit approved | After professor approves edit → Click Update → Edit fields → Save | Referral fields updated | ☐ |

---

## MODULE 4: Accepted Referrals (Clinician — `/accepted-referrals`)

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 4.1 | View accepted referrals | Navigate to Accepted Referrals page | Only referrals accepted by current user shown (via `accepted_by_user_id` or activity log) | ☐ |
| 4.2 | Change status → Ongoing | Accept a referral → Check accepted referrals | Status shows "ongoing" by default | ☐ |
| 4.3 | Change status → Completed | On accepted referral → Change status to "Completed" | `referral_status` = "completed", `referral_status_changed_at` set | ☐ |
| 4.4 | Change status → Deferred | On accepted referral → Change status to "Deferred" | `referral_status` = "deferred" | ☐ |
| 4.5 | Change status → Blacklisted | On accepted referral → Change status to "Blacklisted" | `referral_status` = "blacklisted" | ☐ |
| 4.6 | Request re-referral | Click Rerefer → Enter reason → Submit | `rerefer_request_status` = "pending", reason saved | ☐ |
| 4.7 | Request deletion | Click Delete → Enter reason → Submit | `deletion_request_status` = "pending", reason saved | ☐ |

---

## MODULE 5: Edit Requests (Clinician — `/edit-requests`)

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 5.1 | View edit request results | Navigate to Edit Requests page | Shows referrals with approved/declined edit request status | ☐ |
| 5.2 | Cancel a pending edit request | Click Cancel on a pending edit request | `edit_request_status` and `edit_request_reason` cleared | ☐ |
| 5.3 | Edit referral after approval | After edit request approved, click Update → Edit → Save | Referral fields updated | ☐ |
| 5.4 | Declined edit request visible | Professor declines edit → Check edit requests page | Shows "declined" status | ☐ |

---

## MODULE 6: Professor Page (`/professor`)

### 6A — Viewing & Navigation

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 6.1 | View all referrals as professor | Login as `prof1@example.com` | All referrals visible with professor controls | ☐ |
| 6.2 | Professor cannot accept referrals | Check referral cards | No "Accept" button shown | ☐ |
| 6.3 | Professor can edit referrals | Click Update on a referral → Edit fields → Save | Referral updated (no edit request needed) | ☐ |
| 6.4 | Professor can delete referrals | Click Delete on a referral → Confirm | Referral deleted | ☐ |
| 6.5 | View referral details | Click "..." menu → View Details | Details modal opens with full referral info | ☐ |

### 6B — Filter by Type (Tabs)

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 6.6 | All Referrals tab | Click "All Referrals" | All referrals shown in card view | ☐ |
| 6.7 | Rereferrals tab | Click "Rereferrals" | Table with headers always shown; rows for pending re-referral requests from advisees | ☐ |
| 6.8 | Edit Requests tab | Click "Edit Requests" | Table with headers always shown; rows for pending edit requests from advisees | ☐ |
| 6.9 | Deletion Requests tab | Click "Deletion Requests" | Table with headers always shown; rows for pending deletion requests from advisees | ☐ |
| 6.10 | Empty request tab | Click a request tab with no pending requests | Table headers shown with "No pending ..." message | ☐ |
| 6.11 | Badge counts on tabs | Check badge numbers on Rereferrals/Edit/Deletion tabs | Counts match pending requests from advisees only | ☐ |

### 6C — Filter by Status (Dropdown)

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 6.12 | Filter — All | Select "All" from dropdown | All referrals shown (no status filter) | ☐ |
| 6.13 | Filter — Available | Select "Available" | Only referrals NOT yet accepted shown (`accepted_by` = "None" or empty) | ☐ |
| 6.14 | Filter — Ongoing | Select "Ongoing" | Only referrals with `referral_status` = "ongoing" shown | ☐ |
| 6.15 | Filter — Completed | Select "Completed" | Only referrals with `referral_status` = "completed" shown | ☐ |
| 6.16 | Filter — Deferred | Select "Deferred" | Only referrals with `referral_status` = "deferred" shown | ☐ |
| 6.17 | Filter — Blacklisted | Select "Blacklisted" | Only referrals with `referral_status` = "blacklisted" shown | ☐ |

### 6D — My Advisees Filter

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 6.18 | My Advisees toggle ON | Click "My Advisees" on All Referrals tab | Only referrals created or accepted by professor's advisees shown | ☐ |
| 6.19 | My Advisees toggle OFF | Click "My Advisees" again | All referrals shown again | ☐ |
| 6.20 | My Advisees + Status combined | Toggle "My Advisees" ON → Select "Completed" | Only advisees' completed referrals shown | ☐ |
| 6.21 | My Advisees hidden on request tabs | Switch to Rereferrals/Edit/Deletion tab | "My Advisees" button not visible (auto-filtered to advisees) | ☐ |
| 6.22 | Prof Maria sees correct advisees | Login as `prof1@example.com` → Toggle My Advisees | Only referrals by Carlos Santos, Maria Clara Reyes, Jose Garcia shown | ☐ |
| 6.23 | Prof 2 sees correct advisees | Login as `prof2@example.com` → Toggle My Advisees | Only referrals by Anna Mendoza, Miguel Tan, Sarah Lopez shown | ☐ |

### 6E — Approve/Decline Actions

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 6.24 | Approve edit request | Edit Requests tab → Click Approve → Confirm | `edit_request_status` = "approved" | ☐ |
| 6.25 | Decline edit request | Edit Requests tab → Click Decline → Confirm | `edit_request_status` = "declined" | ☐ |
| 6.26 | Approve re-referral | Rereferrals tab → Click Approve → Confirm | `rerefer_request_status` = "approved" | ☐ |
| 6.27 | Decline re-referral | Rereferrals tab → Click Decline → Confirm | `rerefer_request_status` = "declined" | ☐ |
| 6.28 | Approve deletion request | Deletion tab → Click Approve → Confirm | Referral permanently deleted | ☐ |
| 6.29 | Decline deletion request | Deletion tab → Click Decline → Confirm | `deletion_request_status` = "declined", referral kept | ☐ |

---

## MODULE 7: Professor Dashboard (`/professor/dashboard`)

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 7.1 | Navigate to dashboard | Click dashboard icon in ProfileCard | Dashboard page loads with stats and charts | ☐ |
| 7.2 | Back button | Click ← arrow | Returns to `/professor` page | ☐ |
| 7.3 | Total Referrals card | Check value | Equals count of referrals created by advisees | ☐ |
| 7.4 | Completed card | Check value | Equals count of referrals accepted AND completed by advisees | ☐ |
| 7.5 | Overdue card | Check value | Equals count of advisee-created referrals pending > 7 days without acceptance | ☐ |
| 7.6 | Avg. Acceptance card | Check value | Average days from `created_at` to `accepted_at` for advisee-accepted referrals | ☐ |
| 7.7 | Scope banner | Check banner text | Shows correct number of advisees | ☐ |
| 7.8 | Time period — 7 Days | Click "7 Days" pill | Stats recalculated for last 7 days only | ☐ |
| 7.9 | Time period — 30 Days | Click "30 Days" pill | Stats recalculated for last 30 days only | ☐ |
| 7.10 | Time period — 6 Months | Click "6 Months" pill | Stats recalculated for last 6 months only | ☐ |
| 7.11 | Time period — All Time | Click "All Time" pill | All referrals included regardless of date | ☐ |
| 7.12 | Advisee Referral Status chart | Check bar chart | Bars match count of accepted referrals per status (Ongoing, Completed, Deferred, Blacklisted) | ☐ |
| 7.13 | Advisee Accepted Referrals Over Time | Check line chart | Monthly count of advisee-accepted referrals plotted correctly | ☐ |

---

## MODULE 8: Schedule Planner (`/schedule`)

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 8.1 | View weekly calendar | Navigate to schedule page | Current week displayed with time slots 6AM–6PM | ☐ |
| 8.2 | Navigate to next week | Click → arrow | Calendar shows next week | ☐ |
| 8.3 | Navigate to previous week | Click ← arrow | Calendar shows previous week | ☐ |
| 8.4 | Go to today | Click "Today" button | Calendar jumps to current week | ☐ |
| 8.5 | Change year | Select a different year from dropdown | Calendar jumps to January of that year | ☐ |
| 8.6 | Create event via + button | Click + → Fill title, start/end time → Save → Confirm | Event created and appears on calendar | ☐ |
| 8.7 | Create event via time slot click | Click empty time slot → Fill details → Save → Confirm | Event created with pre-filled times | ☐ |
| 8.8 | Create event — missing required fields | Leave title empty → Save | Validation error shown | ☐ |
| 8.9 | View event details | Click on an event block | Event details modal opens | ☐ |
| 8.10 | Edit event | Open event details → Click Edit → Modify fields → Save → Confirm | Event updated on calendar | ☐ |
| 8.11 | Delete event | Open event details → Click Delete → Confirm | Event removed from calendar | ☐ |
| 8.12 | Event color selection | Create event → Pick a color → Save | Event displayed with chosen color | ☐ |
| 8.13 | Overlapping events | Create two events at same time slot | Both events visible side-by-side in the slot | ☐ |
| 8.14 | Event with patient name | Create event with patient_name filled → Save | Patient name shown in event details | ☐ |
| 8.15 | Event with rich text notes | Create event → Add formatted notes (bold, list) → Save | Notes preserved with formatting | ☐ |

---

## MODULE 9: Profiles / Members Directory (`/profiles`)

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 9.1 | View all profiles | Navigate to Profiles page | All users listed | ☐ |
| 9.2 | Search profiles | Type a name in search box | Results filtered by first/last name | ☐ |
| 9.3 | Filter by role | Click role dropdown → select "Professor" | Only professor profiles shown | ☐ |
| 9.4 | View profile details | Click on a profile card | Profile detail modal/card opens | ☐ |
| 9.5 | Professor sees advisees | Login as professor → go to profiles | Advisees are indicated/tagged | ☐ |

---

## MODULE 10: Profile Editing

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 10.1 | Open edit profile modal | Click pencil icon on ProfileCard | Edit profile modal opens | ☐ |
| 10.2 | Edit name fields | Change first/last name → Save | Profile updated, name reflected in sidebar and header | ☐ |
| 10.3 | Upload/crop avatar | Click avatar → Select image → Crop → Save | Avatar updated with cropped image | ☐ |
| 10.4 | Edit department/year level | Change clinical department or year level → Save | Fields updated in profile | ☐ |

---

## MODULE 11: Activity Logs (`/activity-logs`)

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 11.1 | View activity logs | Navigate to Activity Logs page | All logged actions displayed | ☐ |
| 11.2 | Log on referral create | Create a referral → Check activity logs | CREATE_REFERRAL log entry present | ☐ |
| 11.3 | Log on referral accept | Accept a referral → Check activity logs | ACCEPT_REFERRAL log entry present | ☐ |
| 11.4 | Log on status change | Change referral status → Check activity logs | CHANGE_REFERRAL_STATUS log entry present | ☐ |

---

## MODULE 12: Header & Navigation

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 12.1 | Search in header | Type in header search bar | Relevant referrals/results shown | ☐ |
| 12.2 | Medical alert filter (header) | Select from Medical Alert dropdown | Referrals filtered by selected alert | ☐ |
| 12.3 | Notifications bell | Click notification bell icon | Shows recent activity notifications with badge count | ☐ |
| 12.4 | Navigation links | Click Home / Schedule / Profiles links | Correct pages load | ☐ |
| 12.5 | User profile in header | Check top-right corner | Shows current user's avatar and name | ☐ |

---

## MODULE 13: Sidebar Components

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 13.1 | ProfileCard display | Check sidebar on home page | Shows user name, role, department, avatar, shift, year | ☐ |
| 13.2 | ProfileCard edit button | Click pencil icon | Opens edit profile modal | ☐ |
| 13.3 | Accepted Referrals button + badge | Check sidebar | Button shows count of accepted referrals, navigates to `/accepted-referrals` | ☐ |
| 13.4 | Edit Requests button + badge | Check sidebar | Button shows count of edit requests, navigates to `/edit-requests` | ☐ |
| 13.5 | Schedule Planner widget | Check sidebar | Shows upcoming events with color indicators | ☐ |
| 13.6 | Schedule event deep link | Click an event in Schedule Planner widget | Navigates to `/schedule?event=ID` and highlights event | ☐ |
| 13.7 | Dashboard button (professor) | Login as professor → Check ProfileCard | Dashboard icon visible, links to `/professor/dashboard` | ☐ |

---

## MODULE 14: Data Integrity & Business Rules

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|-----------------|--------|
| 14.1 | Creator ≠ acceptor | Check all accepted referrals in DB | No referral has `user_id` = `accepted_by_user_id` | ☐ |
| 14.2 | Professor never accepts | Login as professor → Check all referrals | Professor's ID never appears in `accepted_by_user_id` | ☐ |
| 14.3 | Professor approves only advisees' requests | Login as Prof Maria → Check request tabs | Only requests from Carlos, Maria Clara, Jose visible | ☐ |
| 14.4 | Seed data correctness | Run seed SQL → Verify referral counts | Prof Maria's advisees: 15 referrals, Prof 2's advisees: 10 referrals | ☐ |
| 14.5 | Accepted_by not corrupted | Accept a referral as User A → Login as User B → Visit home | User A's referral still shows User A as acceptor (not User B) | ☐ |
