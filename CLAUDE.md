# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

A full-featured Church Management System (ChMS) for Calvary Chapel Rosarito, modeled after systems like Breeze/Tithely. The goal is a complete, production-ready platform — not just a CRUD app, but a **workflow engine for ministry**.

The core mental model:
> **Everything revolves around People → Actions → History → Automation**

Every feature should serve this loop: staff add/find people, take actions (send email, record attendance, assign task), all of that is logged to a unified timeline, and the system automates next steps.

---

## Commands

```bash
npm run dev       # Start development server (localhost:3000)
npm run build     # Production build
npm run lint      # Run ESLint
```

**Regenerate Supabase types after schema changes:**
```bash
npx supabase gen types typescript --project-id bicgpmgumivahhsrwayl > src/lib/types/database.types.ts
```

---

## Tech Stack

- **Next.js** (App Router) + **TypeScript** strict mode
- **Supabase** — PostgreSQL, Auth, Row-Level Security
- **Stripe** — payment/giving processing
- **Tailwind CSS v4** — styling only; use `clsx` + `tailwind-merge` for conditional classes
- **React Hook Form** + **Zod** — all forms; schemas in `src/lib/types/schemas/`
- **Resend** — transactional email (`RESEND_API_KEY`, server-only)

---

## Core Modules & Feature Requirements

Build each module completely before moving to the next. Each module has its own service, routes, and UI.

### 1. People (Member Database)
The heart of the system. Every person in the church has a profile.

- Full contact profiles: name, photo, email, phone, address, birthday, anniversary
- **Household/family grouping** — link spouses, children, and relatives under one household unit
- **Custom fields** — admins define additional profile fields (e.g., "Baptized?", "Spiritual Gifts", "T-Shirt Size")
- Member status: `Active`, `Inactive`, `Visitor`, `Deceased`, `Do Not Contact`
- **Unified person timeline** (see Timeline section below) — one feed per person showing all interactions
- Searchable, filterable people list with **saved filter views** (e.g., "Active members born in October")
- Bulk actions: send email, add tag, add to group, export, update status
- Profile photos with upload support
- Import/export via CSV
- **Merge duplicate profiles** via `MemberService.mergeMembers()` — never hard-delete giving or attendance data

### 2. Tagging System (CRITICAL — do not skip)
Tags are the flexible labeling layer that powers filters, automation, and communication targeting.

- Tags are admin-defined freeform labels: `"New Visitor"`, `"Needs Follow-up"`, `"Volunteer"`, `"Baptized"`, `"Prayer Team"`
- Any profile can have multiple tags
- Tags are distinct from Groups (groups have meetings, leaders, attendance; tags are lightweight labels)
- Tags drive: filtered people lists, automation triggers, email targeting
- UI: tag chips on profile, bulk tag/untag from people list

**Tables:** `tags`, `tag_assignments (profile_id, tag_id, assigned_by, assigned_at)`

### 3. Groups
For small groups, ministry teams, Bible studies, committees, etc.

- Create groups with name, description, category, location, schedule
- Group leaders (`event_leader` role) manage their own groups only
- Add/remove members; track join date
- Group attendance tracking per meeting
- Email all group members from within the group
- Group directory (public vs. private toggle)
- Campus filter if multi-campus

### 4. Events & Calendar
- Create one-time and recurring events
- Event categories: Sunday Service, Outreach, Youth, Prayer, etc.
- **Room/resource scheduling** to prevent double-bookings
- Assign event leaders and volunteers (with serve roles)
- **Public event registration** via shareable URL — `register/[signupUrl]` (no auth required)
- Event check-in with **name-tag printing** support
- Attendance recording: mark present/absent per registered attendee
- Event capacity limits and waitlists
- Calendar view (month/week/day) and list view
- iCal/Google Calendar export
- `campus_id` on every event for future multi-campus support

### 5. Giving & Payments
- Record manual donations (cash, check) with fund designation and envelope number
- **Batch entry** for Sunday offering — enter multiple donations quickly in one session
- Online giving via Stripe: one-time and recurring
- **Multiple funds**: General, Missions, Building, etc.
- **Annual giving statements** — generate per person for tax purposes, exportable as PDF
- Donor history per person and household
- **Pledge tracking** — members pledge to a campaign; system tracks fulfillment %
- Giving dashboard: weekly/monthly/annual totals, top funds, trend charts
- **Donations are immutable once recorded** — corrections create reversal entries, never edits
- Stripe webhook handling: payment confirmation, failures, refunds → all logged to `audit_logs`

### 6. Attendance
- Record service attendance: manual headcount OR per-person check-in
- **Attendance reports**: trends over time, first-time visitors, lapsed members (haven't attended in X weeks)
- Percentage attendance per member over any date range
- Link attendance to Sunday service events
- **Child check-in security**: parent-child matching, pickup security codes, allergy/medical notes — non-negotiable for children's ministry

### 7. Tasks & Follow-ups (Pastoral Workflow)
Staff need actionable to-dos, not just notes.

- Create tasks linked to a person: `"Call new visitor"`, `"Follow up on prayer request"`, `"Send welcome packet"`
- Assign tasks to staff members with due dates
- Task status: `Pending`, `In Progress`, `Completed`, `Snoozed`
- Tasks appear on the assignee's dashboard
- Completing a task logs it to the person's unified timeline

**Tables:** `tasks (id, profile_id, assigned_to, title, due_date, status, created_by)`

### 8. Automation Engine
This is what separates a real ChMS from a spreadsheet. Automations trigger actions based on events.

- Admin-configurable automation rules: `IF [trigger] THEN [action]`
- **Triggers**:
  - Person added with status = "Visitor"
  - Tag assigned (e.g., "New Visitor")
  - Person attends for first time
  - Person hasn't attended in N weeks
  - Donation received
  - Form submitted
  - Birthday in X days
- **Actions**:
  - Send email (from template)
  - Create a task for a staff member
  - Assign a tag
  - Add to a group
  - Send notification to admin
- Automation history log per person (shown in their timeline)

**Tables:** `automations`, `automation_triggers`, `automation_actions`, `automation_logs`

### 9. Unified Timeline / Activity Feed (Critical UX)
Every person profile has a single scrollable timeline — the daily tool for pastoral staff.

Per-person timeline shows ALL of:
- Joined group / removed from group
- Attended event
- Gave donation (amount, fund)
- Submitted form
- Received email
- Tag added/removed
- Note added
- Task created/completed
- Automation triggered

This replaces scattered notes with a living, searchable record of ministry engagement.

**Table:** `activity_logs (id, profile_id, actor_id, event_type, metadata jsonb, created_at)`

### 10. Forms
- Admin-created forms: sign-ups, surveys, contact requests, volunteer applications
- Field types: text, email, phone, date, dropdown, checkbox, file upload
- Forms can be standalone or linked to an event
- Public-facing forms (no auth) with shareable links
- Submissions automatically linked to matching member profiles (by email)
- Unmatched submissions create a new visitor profile
- Submission dashboard for admins; export to CSV
- Form submission triggers automation engine

### 11. Communication
- Send email to individuals, groups, or filtered people lists (by tag, status, saved filter)
- Email templates with merge tags: `{{first_name}}`, `{{event_name}}`, `{{giving_total}}`, etc.
- Track email send history per person (shown in timeline)
- Email logs stored in `email_logs`
- (Future) SMS via Twilio

### 12. Volunteer Scheduling
- Define serve roles: Usher, Greeter, Worship Team, AV, Children's Ministry, etc.
- Schedule volunteers per event/service with role
- Track volunteer availability and preferences
- Notify volunteers of upcoming assignments via email (automated)
- Volunteer hours tracking

### 13. Reports & Dashboard
- **Admin dashboard**: total active members, new this month, giving totals this week/month/year, upcoming events, recent activity feed, overdue tasks
- **People reports**: membership growth over time, demographics, tag/status breakdowns
- **Giving reports**: by fund, date range, donor, year-over-year comparison, pledge fulfillment
- **Attendance reports**: service trends, group attendance, lapsed members, first-time visitor follow-up
- All reports exportable to CSV or PDF
- Dashboard metrics must be **cached** (recalculate max once per hour, not on every page load)

---

## Route Structure

```
src/app/
  (admin)/
    dashboard/              # Summary stats, tasks, recent activity
    members/                # People list with filters, search, bulk actions
    members/[id]/           # Profile: timeline, contact, groups, giving, attendance, notes, tasks
    members/[id]/edit/      # Edit profile and custom fields
    households/             # Household management
    tags/                   # Tag management
    groups/                 # Group list
    groups/[id]/            # Group detail: members, attendance, email
    events/                 # Event list and calendar view
    events/[id]/            # Event detail: registrations, attendance, check-in, volunteers
    giving/                 # Giving dashboard and batch entry
    giving/statements/      # Generate/export giving statements
    giving/funds/           # Fund management
    giving/[personId]/      # Individual giving history
    attendance/             # Service attendance recording and reports
    forms/                  # Form builder
    forms/[id]/submissions/ # Form submission viewer
    tasks/                  # All tasks across all staff (admin view)
    automations/            # Automation rule builder
    communication/          # Email composer and send history
    volunteers/             # Volunteer scheduling
    reports/                # All reports
    users/                  # User accounts and role management
    settings/               # Church profile, custom fields, fund setup, campuses
  (leader)/
    dashboard/              # Assigned groups and events, tasks
    events/[id]/            # Leader view: attendance, check-in
    groups/[id]/            # Leader view: members, attendance, email
  auth/                     # OAuth callback
  login/                    # Auth entry point (role-based redirect)
  register/[signupUrl]/     # Public event registration (no auth)
  check-in/                 # Kiosk check-in (no auth, PIN protected)
  api/
    stripe/webhook/         # Stripe payment webhooks
    automations/run/        # Internal endpoint for automation execution
```

---

## Service Layer (Critical Pattern)

All database access goes through singleton service classes in `src/lib/services/`. **Never query Supabase directly from components.**

Every service method returns `ServiceResult<T>`:
```ts
type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };
```

Services never throw. Errors are caught internally and returned as `{ success: false }`. Services are never called from Client Components — use Server Actions or Route Handlers as intermediaries.

**Service Contracts (strict signatures):**

```ts
// MemberService
createMember(input: CreateMemberInput): Promise<ServiceResult<Member>>
updateMember(id: string, input: UpdateMemberInput): Promise<ServiceResult<Member>>
softDeleteMember(id: string, actorId: string): Promise<ServiceResult<void>>
mergeMembers(primaryId: string, duplicateId: string): Promise<ServiceResult<void>>
searchMembers(query: string, filters: MemberFilters, page: number): Promise<ServiceResult<PaginatedResult<Member>>>
logAction(entry: AuditLogEntry): Promise<void>

// GivingService
recordDonation(input: CreateDonationInput): Promise<ServiceResult<Donation>>
reverseDonation(id: string, reason: string, actorId: string): Promise<ServiceResult<void>> // never edits, only reverses
generateStatement(profileId: string, year: number): Promise<ServiceResult<GivingStatement>>

// AutomationService
handleEvent(event: DomainEvent): Promise<void>
runAutomation(automationId: string, profileId: string): Promise<ServiceResult<void>>

// TaskService
createTask(input: CreateTaskInput): Promise<ServiceResult<Task>>
completeTask(id: string, actorId: string): Promise<ServiceResult<void>>

// TimelineService
addEntry(profileId: string, entry: ActivityEntry): Promise<void>
getTimeline(profileId: string, page: number): Promise<ServiceResult<PaginatedResult<ActivityEntry>>>
```

**Services:**
- `MemberService` — people, households, custom fields, tags, merge, duplicate detection
- `GroupService` — groups, membership, group attendance
- `EventService` — events, registrations, attendance, check-in, volunteers
- `GivingService` — donations, funds, pledges, statements, Stripe webhook processing
- `AttendanceService` — service attendance recording and reporting
- `FormService` — form builder, public submissions, profile linking
- `CommunicationService` — email sending, template management, email logs
- `TaskService` — pastoral tasks and assignments
- `AutomationService` — event handling, action execution, automation logs
- `TimelineService` — unified activity feed per person
- `ReportService` — aggregated queries for dashboards and reports (always cached)
- `CalendarService` — calendar views, recurring event expansion
- `EventLeaderService` — leader assignments and permission scoping
- `VolunteerService` — serve roles, scheduling, availability

---

## Internal Domain Events (Event-Driven Architecture)

Use domain events for cross-module actions. This decouples services and enables automation without tight coupling.

Emit these events after state changes. `AutomationService.handleEvent()` and `TimelineService` subscribe to them:

```ts
type DomainEvent =
  | { type: 'member.created'; profileId: string; status: string }
  | { type: 'member.statusChanged'; profileId: string; from: string; to: string }
  | { type: 'tag.assigned'; profileId: string; tagId: string }
  | { type: 'group.joined'; profileId: string; groupId: string }
  | { type: 'event.attended'; profileId: string; eventId: string; firstTime: boolean }
  | { type: 'donation.completed'; profileId: string; amount: number; fundId: string }
  | { type: 'form.submitted'; profileId: string; formId: string }
  | { type: 'task.completed'; profileId: string; taskId: string; actorId: string }
```

Every domain event:
1. Adds an entry to `activity_logs` via `TimelineService` (shows in person timeline)
2. Is evaluated by `AutomationService.handleEvent()` (runs matching automations)

### Timeline Rules
- **Only domain events** can create `activity_logs` entries
- Services must emit events instead of writing to `activity_logs` directly
- `TimelineService` listens to events and writes entries
- This ensures consistency — no service bypasses the timeline

### Automation Execution Model
- Automations run **asynchronously** — never block user-facing requests
- Triggered by domain events via `AutomationService.handleEvent()`
- Executed via background job queue; must be retryable and idempotent
- All executions logged to both `automation_logs` and `audit_logs`

---

## Background Jobs

Use a job queue for async work. All jobs must be retryable and idempotent:
- Automation execution (triggered by domain events)
- Email sending via Resend
- Stripe webhook retries
- Report/statement generation (PDF, CSV)

Never perform these synchronously in a user-facing request.

---

## Data Model Overview

Always derive types from `database.types.ts`. Never manually define DB shapes.

**Core tables:**
- `profiles` — one per auth user; stores role, contact info, photo_url, status, campus_id, household_id
- `households` — family groups; profiles have `household_id`
- `custom_fields` — admin-defined field definitions
- `custom_field_values` — per-profile values for custom fields
- `tags` — freeform label definitions
- `tag_assignments (profile_id, tag_id, assigned_by, assigned_at)`

**Groups & Events:**
- `groups` — ministry groups; `group_members` junction table with join_date
- `events` — all events (one-time and recurring); has `campus_id`
- `event_registrations` — public sign-ups
- `event_attendance (event_id, profile_id, status, checked_in_at)`
- `serve_roles` — volunteer role definitions
- `volunteer_assignments (event_id, profile_id, role_id)`

**Giving:**
- `funds` — General, Missions, Building, etc.
- `donations` — each transaction; linked to profile and fund; `stripe_payment_intent_id` for online; `reversed_by` for corrections
- `pledges (profile_id, fund_id, campaign_id, amount, fulfilled_amount)`
- `giving_batches` — groups Sunday offering entries

**Workflow:**
- `tasks (id, profile_id, assigned_to, title, description, due_date, status, created_by, completed_at)`
- `notes (id, profile_id, content, is_private, created_by, created_at)`
- `activity_logs (id, profile_id, actor_id, event_type, metadata jsonb, created_at)`

**Automation:**
- `automations (id, name, is_active, trigger_type, trigger_config jsonb)`
- `automation_actions (id, automation_id, action_type, action_config jsonb, order)`
- `automation_logs (id, automation_id, profile_id, ran_at, result)`

**Communication:**
- `email_templates (id, name, subject, body_html, merge_tags jsonb)`
- `email_logs (id, profile_id, template_id, subject, sent_at, status)`

**Other:**
- `forms` — form definitions; `form_fields`; `form_submissions`; `form_responses`
- `audit_logs (id, actor_id, action, entity, entity_id, before jsonb, after jsonb, timestamp)`
- `campuses` — for future multi-campus support

---

## Supabase Clients

- `src/lib/supabase/server.ts` — Server Components and Route Handlers
- `src/lib/supabase/client.ts` — Client Components (browser)
- `src/lib/supabase/admin.ts` — Bypasses RLS; server-only; `SUPABASE_SERVICE_ROLE_KEY` never exposed to client

### RLS Requirements
- All tables must have RLS enabled
- Access must be scoped by role, group membership, and event assignment
- Never rely solely on frontend filtering — RLS is the enforcement layer, application checks are defense-in-depth

---

## Roles & Permissions

Three base roles: `admin`, `event_leader`, `member` (stored in `profiles.role`).

**Scoping rules:**
- Admins: full access to all modules and all people
- Event leaders: only their assigned events and groups; cannot see giving data
- Finance team (admin sub-role via tag/custom field): giving visible, other admin areas hidden
- Youth leader example: can only see members of the youth group they lead

Security enforced at **two layers**:
1. **Supabase RLS policies** — database level, row-scoped by role and group assignment
2. **Application level** — layout auth guards and middleware

Never rely on a single layer.

---

## Audit Logging

All CREATE, UPDATE, DELETE on sensitive entities (members, payments, roles, donations, automation rules) must be logged to `audit_logs`.

Required fields: `actor_id`, `action`, `entity`, `entity_id`, `before`, `after`, `timestamp`.

Donations specifically: **never edit a donation record**. All corrections create a reversal entry + new entry, both logged.

---

## Duplicate Detection

On profile creation, check for existing profiles by:
- Email (exact match)
- Phone (normalized)

Flag potential duplicates for admin review before creating. `MemberService.mergeMembers()` must transfer all related records (donations, attendance, groups, tags, timeline) from duplicate to primary before soft-deleting the duplicate.

---

## Non-Functional Requirements

### Performance
- People search must return results in **<300ms** — debounced input, server-side query, indexed columns
- Dashboard metrics must be **cached** — recalculate max once per hour using `unstable_cache` or background job
- All list queries must be **paginated** (default page size: 25)
- Avoid N+1 queries — fetch related data in bulk in the service layer
- Timeline queries must use cursor-based pagination, not offset
- Required indexes: `email`, `last_name`, `event_date`, `donation_date`, `tag_assignments(profile_id)`, `activity_logs(profile_id, created_at)`

### Data Integrity
- **Soft deletes only** for profiles — set `deleted_at`, never `DELETE`. Giving, attendance, and timeline records must survive profile deletion
- Donations are **immutable** once recorded — corrections only via reversal entries
- All writes must be **idempotent** where possible (especially Stripe webhook handlers)

---

## Security

- Rate limit all public endpoints: forms, event registration, login
- Fail closed for auth and payment routes
- `SUPABASE_SERVICE_ROLE_KEY` and `STRIPE_SECRET_KEY` are never `NEXT_PUBLIC_` — any occurrence in client code is a critical security bug

---

## Environments

- `dev`, `staging`, `production`
- Never use production Stripe keys or Supabase credentials in development

---

## Monitoring & Logging

- Log all service errors
- Track failed automations and email delivery failures
- Alert on Stripe webhook failures

---

## Forms

- Every form: React Hook Form + Zod schema
- Zod schemas in `src/lib/types/schemas/` — shared between client validation and server-side parsing
- Server Actions **re-validate** with the same Zod schema — never trust client data
- Public forms (no auth) submit to Route Handlers, never Server Actions

---

## Key Conventions

- **Prefer Server Components** by default. Only add `'use client'` when truly necessary
- **TypeScript**: Use auto-generated types from `database.types.ts`. Never manually define DB shapes
- **Path aliases**: `@/*` → `src/*`, `@lib/*` → `src/lib/*`, `@components/*` → `src/components/*`
- **Styling**: Tailwind utility classes only. Extract repeated class combos into components, not strings
- **Server data**: Fetch in Server Components or Route Handlers; use `revalidate` / `unstable_cache`
- **Pagination**: All list views must be paginated. No unbounded queries
- **Empty states**: Every list view needs a meaningful empty state with a clear CTA
- **Loading states**: Use `loading.tsx` and Suspense boundaries throughout
- **Error handling**: Every page needs an `error.tsx` boundary
- **Confirmation dialogs**: Required before all destructive actions (delete, merge, reverse donation)

---

## UX Principles

This system will be used by church staff — many are not technical. Design for them.

- Clean, simple UI — no unnecessary complexity or jargon
- Consistent navigation: sidebar always present in admin/leader layouts
- **People search is the most-used feature** — it must be instant, prominent, and forgiving (fuzzy match on name, email, phone)
- **The person timeline is the daily tool** — it must load fast and be easy to scan
- Mobile-responsive — staff use tablets and phones during services
- Inline validation with clear, human-readable error messages
- Avoid modal hell — prefer page-level flows for complex actions
- Task notifications and overdue items must be visible on the dashboard

---

## Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=           # Server-only
STRIPE_SECRET_KEY=                   # Server-only
STRIPE_WEBHOOK_SECRET=               # Server-only
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
NEXT_PUBLIC_APP_URL=
RESEND_API_KEY=                      # Server-only (transactional email)
```
