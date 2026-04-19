-- Phase 4: Service Layer Completion
-- Run in Supabase SQL editor

-- 1. Activity timeline — one entry per ministry interaction
CREATE TABLE IF NOT EXISTS activity_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID        NOT NULL REFERENCES members(id)  ON DELETE CASCADE,
  actor_id    UUID                 REFERENCES profiles(id) ON DELETE SET NULL,
  event_type  TEXT        NOT NULL,
  metadata    JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_pid ON activity_logs (profile_id, created_at DESC);

-- 2. Pastoral tasks
CREATE TABLE IF NOT EXISTS tasks (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   UUID        NOT NULL REFERENCES members(id)  ON DELETE CASCADE,
  assigned_to  UUID                 REFERENCES profiles(id) ON DELETE SET NULL,
  created_by   UUID                 REFERENCES profiles(id) ON DELETE SET NULL,
  title        TEXT        NOT NULL,
  description  TEXT,
  due_date     DATE,
  status       TEXT        NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending','in_progress','completed','snoozed')),
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks (assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_profile_id  ON tasks (profile_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status      ON tasks (status);

-- 3. Email send log
CREATE TABLE IF NOT EXISTS email_logs (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID                 REFERENCES members(id) ON DELETE SET NULL,
  to_email   TEXT        NOT NULL,
  subject    TEXT        NOT NULL,
  status     TEXT        NOT NULL DEFAULT 'sent',
  resend_id  TEXT,
  error      TEXT,
  sent_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_logs_profile_id ON email_logs (profile_id);

-- Now that activity_logs and member_tags exist, add their indexes
-- (member_tags is the existing tag-assignment table)
CREATE INDEX IF NOT EXISTS idx_member_tags_member_id ON member_tags (member_id);
