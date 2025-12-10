-- Phase 9 schema additions

CREATE TYPE task_status AS ENUM ('open', 'completed', 'cancelled');

CREATE TABLE communications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id uuid REFERENCES applications(id) ON DELETE SET NULL,
    type text NOT NULL,
    direction text NOT NULL,
    body text NOT NULL,
    "from" text NOT NULL,
    "to" text NOT NULL,
    metadata jsonb NOT NULL DEFAULT '{}',
    "timestamp" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    assigned_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    assigned_to_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    application_id uuid REFERENCES applications(id) ON DELETE SET NULL,
    title text NOT NULL,
    description text NOT NULL DEFAULT '',
    due_date timestamptz,
    status task_status NOT NULL DEFAULT 'open',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type text NOT NULL,
    payload_json jsonb NOT NULL DEFAULT '{}',
    "read" boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);
