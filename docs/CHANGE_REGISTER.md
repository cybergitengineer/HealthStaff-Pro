# HealthStaffPro — Phase 0 Audit and Change Register (v2)

Audited commit: `5202f51` (main, "Set default country code to '+' for manual input").
Measured against: *Revised Master Development Change Plan and AI Requirements* (the AI-assisted marketplace version).

**Method and limits.** Static read of `package.json`, `shared/schema.ts`, `server/*` and the client page inventory. **Nothing was run.** `npm install` failed in the audit environment, so build and `tsc` results are unverified. Client page internals were inventoried by file, not read line by line. `attached_assets/` and `staff_list.csv` were only skimmed.

**Not seen: your local modifications.** The plan says to preserve the local changes to `server/notifications.ts` and the untracked `startup-error.log`. This audit read the **committed** `server/notifications.ts` on GitHub only. Local uncommitted edits and `startup-error.log` are not visible from the repo. Before the notification work (C7), commit or share both so they can be reviewed.

## 0. Owner decisions recorded

| Question | Decision |
|---|---|
| Real users or data so far? | **No.** Credential rotation is not needed; schema changes can be made deliberately without data-preservation constraints. |
| Age-group matching requirement? | **Remove.** Not used for eligibility or ranking. |
| Families as a first-class employer type? | **Later**, since families usually go through agents. Agencies and care homes are the first-release employers. |
| Stack | Express 5 + TypeScript backend, React/Vite frontend, Drizzle ORM, PostgreSQL via `pg` (owner reports PG 16). Developed in GitHub Codespaces. **Production host unconfirmed.** `.replit` / `replit.md` are leftovers. `211-db.sqlite` is a 0-byte file nothing imports. |
| First AI feature | Condition-aware caregiver recommendations, then automated invitation waves driven by them. |

## 1. How the code differs from the plan

| Plan assumes | Code actually is |
|---|---|
| Employer creates request; system ranks eligible caregivers and invites a first wave | Reverse flow: employer posts a shift, an SMS goes to **every verified worker**, workers apply, employer accepts. |
| Structured care request with client condition | Shift has profession, experience level, skills (a fixed list per profession), environment, urgency, pay. No client-condition taxonomy. `location` is free text; no coordinates. |
| Condition-specific experience with evidence levels | One `experienceLevel` enum and a skills text array on the worker. Nothing records evidence source. |
| Availability windows and the available / invited / interested / confirmed states | Seven weekday booleans on `worker_profiles`. |
| Three-layer matching with explanations | Eligibility filters only, and only from the **worker's** side (`getMatchingShiftsForWorker`: profession, experience, skills). No employer-side search, no ranking, no explanations. |
| In-app notifications and messaging | None. Courier SMS only, no delivery log. |
| Caregiver declares completion, hirer confirms or disputes | Partial: worker check-in/check-out, then admin "approve" sets the shift `completed` and payout `processing`. No declaration state, awaiting-confirmation state, reminders, escalation or dispute path. |
| Category ratings, tiers, Passport | None. `reliabilityScore` is an integer defaulting to 100 with no events behind it. |
| Travel-time estimates | None. |
| Audit log, rate limiting, tests | None. |

Recommendation: **keep the tenant/facility model and the existing apply flow** (as the "controlled expansion" fallback) and layer the plan's features on top. A rewrite is not justified by the audit.

## 2. Change register

### A. Already implemented (by code reading; not run)
- JWT login/registration, bcrypt hashing, 24h expiry; `SESSION_SECRET` required at startup.
- Role middleware (`SUPER_ADMIN`, `TENANT_ADMIN`, `FACILITY_ADMIN`, `WORKER`) on most routes.
- Tenant and facility CRUD; admin verify and suspend of workers.
- Worker registration with profession, experience, skills, certifications, license number/expiry.
- Shift create/update with structured fields (profession, experience, skills, environment, urgency, pay).
- Worker-side eligibility filtering of open shifts (Layer 1, partial).
- Application flow with a verified-only gate, duplicate check, accept → assignment → shift `filled`, auto-reject others.
- Assignment check-in/out and admin approval, with ownership checks.
- Courier SMS with graceful skip when the key is missing; dashboard stats; profile editing.

### B. Implemented but defective or incomplete

| ID | Pri | Issue | Where | Acceptance criterion |
|---|---|---|---|---|
| B1 | P0 | **Password hash returned to clients and logged.** `getUserWithProfile` and `getWorkers` spread the full user row, so login/register/`/me` and the worker list include `passwordHash`; the request logger writes full JSON response bodies, including the JWT. | `server/storage.ts:143,173`, `server/index.ts` | No response contains `passwordHash`; logs contain no tokens or hashes; tests assert both. |
| B2 | P0 | **Hardcoded default credentials.** `admin@example.com` / `admin123` auto-created on an empty DB and printed; also in `seed.ts`, `script/createAdmin.ts`; fixed `Staff123!` password for admin-created workers (`routes.ts:349,416`). | `server/ensureAdmin.ts`, `seed.ts`, `script/*`, `routes.ts` | No default credential in startup code; admin comes from env-supplied one-time password; worker accounts get a random temporary password and forced reset. |
| B3 | P0 | **Cross-tenant gap.** `PATCH /api/applications/:id` checks tenant only for `FACILITY_ADMIN`; `TENANT_ADMIN` is unchecked. `status` is not validated. Facility-level scoping is by tenant, not facility. | `server/routes.ts:624` | Test: admin of tenant A gets 403 on tenant B's applications, shifts, assignments, facilities. `status` limited to the allowed enum values. |
| B4 | P0 | **Public self-registration accepts `FACILITY_ADMIN`/`TENANT_ADMIN`** (the client even offers "Facility admin"); login blocks only `suspended`. | `shared/schema.ts` registerSchema, `routes.ts:103`, `client/src/pages/register.tsx` | Public registration creates workers only; facility/tenant admins are created by an authorized admin or an approved invitation; unapproved employer accounts cannot create shifts. |
| B5 | P0 | **Booking not transactional or conflict-safe.** Accept checks `shift.status`, then writes assignment, shift and rejections separately; no overlap check across a worker's assignments; the duplicate check loads all assignments. | `routes.ts:660-745` | One DB transaction with row lock; unique constraints; concurrent-accept and overlapping-shift tests pass. |
| B6 | P1 | **Blanket SMS broadcast** to all verified workers on every new shift, with no preference, availability or consent check, no delivery log, and SMS text naming the facility and shift. Opposes plan §4.2 and §8. | `routes.ts:496-520`, `notifications.ts` | Broadcast removed from the default path; sends recorded with status; no care detail in SMS. |
| B7 | P1 | Unauthenticated `/api/export-workers` (names, emails, phones). Currently unmounted dead code. | `server/routes/export.ts` | Deleted, or SUPER_ADMIN-only with audit log. |
| B8 | P1 | **Startup "repair" mutates users on every boot**, with hardcoded name checks ("Anesu" → +263, "Queen" → +250). | `server/index.ts` | Removed from startup; replaced by a reviewed one-off script if still needed. |
| B9 | P1 | **Age group used as a matching criterion and collected at registration** (`requiredAgeGroup`, `ageGroup`). Owner decision: remove. | `schema.ts`, `storage.ts:250`, register/profile/shift forms | Age group not used in eligibility or ranking, not requested in the UI; migration drops or nulls the columns. |
| B10 | P1 | `reliabilityScore` defaults to 100 with no evidence; plan §12 forbids unsupported scores. | `schema.ts` | Not displayed or used until evidence-based inputs exist. |
| B11 | P2 | No rate limiting, security headers or CORS policy; JWT signed with the session secret. | `server/index.ts` | Login/register rate-limited; helmet; separate JWT secret. |
| B12 | P2 | Reminder and cancellation notifications written but never called. | `notifications.ts` | Wired to events with dedupe. |
| B13 | P2 | Repo hygiene: empty `211-db.sqlite` (the `*.db` ignore rule misses `.sqlite`); `attached_assets/` contains a pasted prompt and screenshots; `staff_list.csv` has `+1` last names that `runRepair` was patching. | repo root | Removed or ignored; assets reviewed for sensitive content. |
| B14 | P2 | `tsconfig.json` uses `baseUrl`, rejected by the newest TypeScript; no migrations folder, only `drizzle-kit push`. | `tsconfig.json` | `npm run check` and `build` pass in CI; migrations in place before the first production database. |
| B15 | P1 | **Completion is admin-approved on caregiver check-out only**; no declaration/confirmation/dispute states. Partial match to plan §10. | `routes.ts:781-876` | See C9. |

### C. Missing and required for the first release (plan §19)

| ID | Pri | Item | Depends on | Acceptance criterion |
|---|---|---|---|---|
| C1 | P0 | Test harness (Vitest + supertest, test DB) and CI running `check`, `build`, tests | none | Green CI; covers B1–B5 |
| C2 | P1 | Care-condition taxonomy and per-caregiver condition experience with evidence level (`self_reported` / `reference` / `platform` / `verified_training`); structured care request fields | C1; taxonomy confirmed with real employers and caregivers | A request lists conditions; caregiver profile records experience per condition with its evidence source |
| C3 | P1 | `availability_windows` (timestamptz start/end, shift type, recurrence, radius, rate, paused/expiry), replacing the weekday JSON | C1 | Worker can add, edit, pause; expired windows never matched; DST test |
| C4 | P1 | Employer-side matching: Layer 1 eligibility (mandatory credentials, availability, no conflicts) then Layer 2 weighted ranking, with stored explanations and uncertainty notes | C2, C3, B9 | Missing mandatory credential is never listed; explanations label verified / self-reported / estimated; baseline metrics from plan §6.2 computed on a seeded request set |
| C5 | P1 | `invitations` plus invitation waves: wave size, approval vs automatic mode, expiry, supersede, one active invitation per (shift, caregiver) | B5, C4 | Automatic outreach never creates an assignment; retries create no duplicate invitation |
| C6 | P1 | In-app notifications (primary channel) and per-user preferences; delivery log with retries; SMS/email as supplements | C5; review of the local `notifications.ts` changes | Opted-out users not contacted; failures recorded and retried; SMS holds no care detail |
| C7 | P1 | In-app messaging tied to a request, invitation or assignment, with participant-only access, report/block, no phone/address exposure | C5 | A non-participant gets 403 on every conversation route |
| C8 | P1 | Employer confirm-booking step with server revalidation, and assignment status history | B5, C5 | Overlapping confirmations rejected; each transition recorded with actor and time |
| C9 | P1 | Completion workflow: caregiver declaration → awaiting employer confirmation → confirm / dispute / clarify; reminders and escalation; timeout never counts as verified | C8, C6 | Unconfirmed shifts excluded from verified-completion stats; dispute path reaches an admin queue |
| C10 | P2 | Category ratings (1–5 plus comment) tied to completed assignments, one per party per assignment, report/dispute | C9 | Duplicate rejected by DB constraint; unconfirmed assignments not ratable |
| C11 | P2 | Credential and reference verification states; admin verification queue | none | UI never displays unverified as verified |
| C12 | P2 | Audit log for admin, assignment and messaging-moderation actions | none | Verify, suspend, accept, cancel, dispute produce audit rows |
| C13 | P2 | Event log for outreach and booking outcomes (invited, viewed, responded, selected, overridden) so baseline and later models have trustworthy data | C5 | Metrics in plan §6.2 can be computed from the log |

### D. Deferred (later AI and optimization phases)
Gold/Silver/Bronze tiers and CareMatch Passport (needs C10, C11 and defined thresholds first); route-based travel estimates and location-aware discovery (needs a routing-provider comparison and geocoded service areas); learned recommender and response prediction; reliability prediction; anomaly detection; scheduling optimization; dynamic pricing. Each needs the baseline and evaluation record from plan §13 before deployment.

## 3. Recommended order of work

1. **PR 1: security fixes (B1, B2, B3, B4, B7, B8).** No new features, minimal schema impact.
2. **PR 2: tests and CI (C1, B14),** locking in PR 1.
3. **PR 3: transactional booking and overlap prevention (B5).**
4. **PR 4: remove age group (B9); condition taxonomy and structured requests (C2).**
5. **PR 5: availability windows (C3) and employer-side matching with explanations (C4).** First AI-assisted capability: rules-based baseline plus metrics.
6. **PR 6: invitations and waves (C5), in-app notifications (C6), event log (C13).** Retire the blanket SMS (B6).
7. **PR 7: messaging (C7).**
8. **PR 8: confirm booking and completion workflow (C8, C9, B15).**
9. Then ratings, verification and audit (C10–C12), followed by Phase 4 and later items.

Starting the AI work with condition-aware recommendations (PR 4–5) matches your stated priority. Event logging (C13) is deliberately early because a learned recommender is only as good as the outcome data collected from the first release onward.

## 4. Open items
1. Share or commit the local `server/notifications.ts` changes and `startup-error.log`.
2. Confirm where production will be hosted (Codespaces is development only).
3. Condition taxonomy: who supplies the first category list (employers, agency contacts, caregivers)?
4. Legal review of employer preference handling (gender, language) before it is built into matching.
