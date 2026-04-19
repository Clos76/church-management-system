-- Phase 3: Data Safety & Consistency
-- Run this migration in the Supabase SQL editor or via: supabase db push

-- 1. Unique constraint on registrations(member_id, event_id)
--    Eliminates the race condition in createPublicRegistration.
--    Concurrent duplicate submissions will get a 23505 error (handled in service).
ALTER TABLE registrations
  ADD CONSTRAINT uq_member_event UNIQUE (member_id, event_id);

-- 2. Indexes on existing tables
CREATE INDEX IF NOT EXISTS idx_members_last_name  ON members (last_name);
CREATE INDEX IF NOT EXISTS idx_members_email      ON members (email);
CREATE INDEX IF NOT EXISTS idx_events_event_date  ON events  (event_date);

-- tag_assignments and activity_logs indexes will be added when those tables are created (Phase 4/6)
