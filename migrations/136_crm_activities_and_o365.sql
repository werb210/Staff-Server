-- CRM activities + O365 send-as registry. Idempotent.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Notes ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crm_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);
ALTER TABLE crm_notes ADD COLUMN IF NOT EXISTS body          TEXT NOT NULL DEFAULT '';
ALTER TABLE crm_notes ADD COLUMN IF NOT EXISTS owner_id      UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE crm_notes ADD COLUMN IF NOT EXISTS contact_id    UUID REFERENCES contacts(id) ON DELETE CASCADE;
ALTER TABLE crm_notes ADD COLUMN IF NOT EXISTS company_id    UUID REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE crm_notes ADD COLUMN IF NOT EXISTS silo          TEXT NOT NULL DEFAULT 'BF';
ALTER TABLE crm_notes ADD COLUMN IF NOT EXISTS created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE crm_notes ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE crm_notes ALTER COLUMN body DROP DEFAULT;
CREATE INDEX IF NOT EXISTS crm_notes_contact_idx ON crm_notes(contact_id);
CREATE INDEX IF NOT EXISTS crm_notes_company_idx ON crm_notes(company_id);
CREATE INDEX IF NOT EXISTS crm_notes_silo_idx    ON crm_notes(silo);

-- Tasks (mirrored from O365 To-Do when graph_id IS NOT NULL) ----------
CREATE TABLE IF NOT EXISTS crm_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);
ALTER TABLE crm_tasks ADD COLUMN IF NOT EXISTS title         TEXT NOT NULL DEFAULT '';
ALTER TABLE crm_tasks ADD COLUMN IF NOT EXISTS notes         TEXT;
ALTER TABLE crm_tasks ADD COLUMN IF NOT EXISTS due_at        TIMESTAMPTZ;
ALTER TABLE crm_tasks ADD COLUMN IF NOT EXISTS reminder_at   TIMESTAMPTZ;
ALTER TABLE crm_tasks ADD COLUMN IF NOT EXISTS task_type     TEXT NOT NULL DEFAULT 'todo';
ALTER TABLE crm_tasks ADD COLUMN IF NOT EXISTS priority      TEXT NOT NULL DEFAULT 'none';
ALTER TABLE crm_tasks ADD COLUMN IF NOT EXISTS queue_name    TEXT;
ALTER TABLE crm_tasks ADD COLUMN IF NOT EXISTS assigned_to   UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE crm_tasks ADD COLUMN IF NOT EXISTS owner_id      UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE crm_tasks ADD COLUMN IF NOT EXISTS contact_id    UUID REFERENCES contacts(id) ON DELETE SET NULL;
ALTER TABLE crm_tasks ADD COLUMN IF NOT EXISTS company_id    UUID REFERENCES companies(id) ON DELETE SET NULL;
ALTER TABLE crm_tasks ADD COLUMN IF NOT EXISTS status        TEXT NOT NULL DEFAULT 'open';
ALTER TABLE crm_tasks ADD COLUMN IF NOT EXISTS graph_id      TEXT;
ALTER TABLE crm_tasks ADD COLUMN IF NOT EXISTS silo          TEXT NOT NULL DEFAULT 'BF';
ALTER TABLE crm_tasks ADD COLUMN IF NOT EXISTS created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE crm_tasks ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE crm_tasks ALTER COLUMN title DROP DEFAULT;
CREATE INDEX IF NOT EXISTS crm_tasks_contact_idx   ON crm_tasks(contact_id);
CREATE INDEX IF NOT EXISTS crm_tasks_company_idx   ON crm_tasks(company_id);
CREATE INDEX IF NOT EXISTS crm_tasks_assigned_idx  ON crm_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS crm_tasks_due_idx       ON crm_tasks(due_at);
CREATE INDEX IF NOT EXISTS crm_tasks_silo_idx      ON crm_tasks(silo);

-- Meetings (mirrored from O365 Calendar when graph_id IS NOT NULL) ----
CREATE TABLE IF NOT EXISTS crm_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);
ALTER TABLE crm_meetings ADD COLUMN IF NOT EXISTS title              TEXT NOT NULL DEFAULT '';
ALTER TABLE crm_meetings ADD COLUMN IF NOT EXISTS attendee_description TEXT;
ALTER TABLE crm_meetings ADD COLUMN IF NOT EXISTS internal_note      TEXT;
ALTER TABLE crm_meetings ADD COLUMN IF NOT EXISTS start_at           TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE crm_meetings ADD COLUMN IF NOT EXISTS end_at             TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE crm_meetings ADD COLUMN IF NOT EXISTS location           TEXT;
ALTER TABLE crm_meetings ADD COLUMN IF NOT EXISTS attendees_json     JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE crm_meetings ADD COLUMN IF NOT EXISTS reminder_minutes   INTEGER NOT NULL DEFAULT 60;
ALTER TABLE crm_meetings ADD COLUMN IF NOT EXISTS owner_id           UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE crm_meetings ADD COLUMN IF NOT EXISTS contact_id         UUID REFERENCES contacts(id) ON DELETE SET NULL;
ALTER TABLE crm_meetings ADD COLUMN IF NOT EXISTS company_id         UUID REFERENCES companies(id) ON DELETE SET NULL;
ALTER TABLE crm_meetings ADD COLUMN IF NOT EXISTS graph_id           TEXT;
ALTER TABLE crm_meetings ADD COLUMN IF NOT EXISTS silo               TEXT NOT NULL DEFAULT 'BF';
ALTER TABLE crm_meetings ADD COLUMN IF NOT EXISTS created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE crm_meetings ADD COLUMN IF NOT EXISTS updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE crm_meetings ALTER COLUMN title DROP DEFAULT;
ALTER TABLE crm_meetings ALTER COLUMN start_at DROP DEFAULT;
ALTER TABLE crm_meetings ALTER COLUMN end_at DROP DEFAULT;
CREATE INDEX IF NOT EXISTS crm_meetings_contact_idx ON crm_meetings(contact_id);
CREATE INDEX IF NOT EXISTS crm_meetings_company_idx ON crm_meetings(company_id);
CREATE INDEX IF NOT EXISTS crm_meetings_owner_idx   ON crm_meetings(owner_id);
CREATE INDEX IF NOT EXISTS crm_meetings_start_idx   ON crm_meetings(start_at);
CREATE INDEX IF NOT EXISTS crm_meetings_silo_idx    ON crm_meetings(silo);

-- Calls log (Twilio call records linked to contacts) ------------------
CREATE TABLE IF NOT EXISTS crm_call_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);
ALTER TABLE crm_call_log ADD COLUMN IF NOT EXISTS direction       TEXT NOT NULL DEFAULT 'outbound';
ALTER TABLE crm_call_log ADD COLUMN IF NOT EXISTS from_number     TEXT;
ALTER TABLE crm_call_log ADD COLUMN IF NOT EXISTS to_number       TEXT;
ALTER TABLE crm_call_log ADD COLUMN IF NOT EXISTS twilio_call_sid TEXT;
ALTER TABLE crm_call_log ADD COLUMN IF NOT EXISTS duration_sec    INTEGER;
ALTER TABLE crm_call_log ADD COLUMN IF NOT EXISTS recording_url   TEXT;
ALTER TABLE crm_call_log ADD COLUMN IF NOT EXISTS notes           TEXT;
ALTER TABLE crm_call_log ADD COLUMN IF NOT EXISTS owner_id        UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE crm_call_log ADD COLUMN IF NOT EXISTS contact_id      UUID REFERENCES contacts(id) ON DELETE SET NULL;
ALTER TABLE crm_call_log ADD COLUMN IF NOT EXISTS company_id      UUID REFERENCES companies(id) ON DELETE SET NULL;
ALTER TABLE crm_call_log ADD COLUMN IF NOT EXISTS silo            TEXT NOT NULL DEFAULT 'BF';
ALTER TABLE crm_call_log ADD COLUMN IF NOT EXISTS created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE INDEX IF NOT EXISTS crm_calls_contact_idx ON crm_call_log(contact_id);
CREATE INDEX IF NOT EXISTS crm_calls_company_idx ON crm_call_log(company_id);
CREATE INDEX IF NOT EXISTS crm_calls_owner_idx   ON crm_call_log(owner_id);
CREATE INDEX IF NOT EXISTS crm_calls_silo_idx    ON crm_call_log(silo);

-- Sent emails log (records every email sent through the portal) -------
CREATE TABLE IF NOT EXISTS crm_email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);
ALTER TABLE crm_email_log ADD COLUMN IF NOT EXISTS from_address     TEXT NOT NULL DEFAULT '';
ALTER TABLE crm_email_log ADD COLUMN IF NOT EXISTS to_addresses      TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE crm_email_log ADD COLUMN IF NOT EXISTS cc_addresses      TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE crm_email_log ADD COLUMN IF NOT EXISTS bcc_addresses     TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE crm_email_log ADD COLUMN IF NOT EXISTS subject           TEXT NOT NULL DEFAULT '';
ALTER TABLE crm_email_log ADD COLUMN IF NOT EXISTS body_html         TEXT;
ALTER TABLE crm_email_log ADD COLUMN IF NOT EXISTS owner_id          UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE crm_email_log ADD COLUMN IF NOT EXISTS contact_id        UUID REFERENCES contacts(id) ON DELETE SET NULL;
ALTER TABLE crm_email_log ADD COLUMN IF NOT EXISTS company_id        UUID REFERENCES companies(id) ON DELETE SET NULL;
ALTER TABLE crm_email_log ADD COLUMN IF NOT EXISTS graph_message_id  TEXT;
ALTER TABLE crm_email_log ADD COLUMN IF NOT EXISTS silo              TEXT NOT NULL DEFAULT 'BF';
ALTER TABLE crm_email_log ADD COLUMN IF NOT EXISTS created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE crm_email_log ALTER COLUMN from_address DROP DEFAULT;
CREATE INDEX IF NOT EXISTS crm_emails_contact_idx ON crm_email_log(contact_id);
CREATE INDEX IF NOT EXISTS crm_emails_company_idx ON crm_email_log(company_id);
CREATE INDEX IF NOT EXISTS crm_emails_owner_idx   ON crm_email_log(owner_id);
CREATE INDEX IF NOT EXISTS crm_emails_silo_idx    ON crm_email_log(silo);

-- Shared mailbox registry (which addresses can be used as From) -------
CREATE TABLE IF NOT EXISTS shared_mailbox_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);
ALTER TABLE shared_mailbox_settings ADD COLUMN IF NOT EXISTS address       TEXT NOT NULL DEFAULT '';
ALTER TABLE shared_mailbox_settings ADD COLUMN IF NOT EXISTS display_name  TEXT;
ALTER TABLE shared_mailbox_settings ADD COLUMN IF NOT EXISTS allowed_roles TEXT[] NOT NULL DEFAULT '{Admin,Staff,Marketing}';
ALTER TABLE shared_mailbox_settings ADD COLUMN IF NOT EXISTS silo          TEXT NOT NULL DEFAULT 'BF';
ALTER TABLE shared_mailbox_settings ADD COLUMN IF NOT EXISTS created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE shared_mailbox_settings ALTER COLUMN address DROP DEFAULT;
CREATE UNIQUE INDEX IF NOT EXISTS shared_mailbox_address_uidx
  ON shared_mailbox_settings(LOWER(address), silo);

INSERT INTO shared_mailbox_settings (address, display_name, silo)
SELECT 'info@boreal.financial', 'Boreal Financial — Info', 'BF'
WHERE NOT EXISTS (SELECT 1 FROM shared_mailbox_settings WHERE LOWER(address) = 'info@boreal.financial');

INSERT INTO shared_mailbox_settings (address, display_name, silo)
SELECT 'accounting@boreal.financial', 'Boreal Financial — Accounting', 'BF'
WHERE NOT EXISTS (SELECT 1 FROM shared_mailbox_settings WHERE LOWER(address) = 'accounting@boreal.financial');

-- Companies.types_of_financing (multi-tag) ----------------------------
ALTER TABLE companies ADD COLUMN IF NOT EXISTS types_of_financing TEXT[] NOT NULL DEFAULT '{}';
CREATE INDEX IF NOT EXISTS companies_types_of_financing_gin_idx
  ON companies USING GIN (types_of_financing);

-- Contacts.lifecycle_stage (HubSpot-equivalent), keep alongside lead_status
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS lifecycle_stage TEXT DEFAULT 'lead';
CREATE INDEX IF NOT EXISTS contacts_lifecycle_idx ON contacts(lifecycle_stage);
