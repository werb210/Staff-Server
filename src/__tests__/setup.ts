import { installProcessHandlers } from "../observability/processHandlers";
import { markReady } from "../startupState";

process.env.NODE_ENV = "test";
process.env.BASE_URL ||= "http://127.0.0.1:3000";
process.env.RUN_MIGRATIONS = "false";
process.env.DB_READY_ATTEMPTS = "1";
process.env.DB_READY_BASE_DELAY_MS = "1";
process.env.TWILIO_ACCOUNT_SID = "ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";
process.env.TWILIO_AUTH_TOKEN = "test-auth-token-1234567890";
process.env.TWILIO_VERIFY_SERVICE_SID = "VA00000000000000000000000000000000";
process.env.JWT_SECRET = "test-access-secret";
process.env.LOGIN_LOCKOUT_THRESHOLD = "2";
process.env.LOGIN_LOCKOUT_MINUTES = "10";
process.env.PASSWORD_MAX_AGE_DAYS = "30";

markReady();
installProcessHandlers();

beforeAll(async () => {
  const { pool } = await import("../db");
  await pool.query("drop table if exists auth_refresh_tokens cascade;");
  await pool.query("drop table if exists otp_verifications cascade;");
  await pool.query("drop table if exists audit_events cascade;");
  await pool.query("drop table if exists lenders cascade;");
  await pool.query("drop table if exists users cascade;");
  await pool.query(`
    create table if not exists users (
      id uuid primary key,
      email text null,
      phone_number text null unique,
      phone text null,
      role text null,
      active boolean not null default true,
      is_active boolean null,
      disabled boolean null,
      locked_until timestamptz null,
      phone_verified boolean not null default false,
      token_version integer not null default 0
    );
  `);
  await pool.query(`
    create table if not exists auth_refresh_tokens (
      id uuid primary key,
      user_id uuid not null references users(id) on delete cascade,
      token text not null,
      token_hash text not null,
      expires_at timestamptz not null,
      revoked_at timestamptz null,
      created_at timestamptz not null default now()
    );
  `);
  await pool.query(`
    create table if not exists otp_verifications (
      id uuid primary key,
      user_id uuid not null references users(id) on delete cascade,
      phone text not null,
      verification_sid text,
      status text not null,
      verified_at timestamptz,
      created_at timestamptz not null default now()
    );
  `);
  await pool.query(`
    create table if not exists audit_events (
      actor_user_id uuid null,
      target_user_id uuid null,
      target_type text null,
      target_id text null,
      event_type text not null,
      event_action text not null,
      ip_address text null,
      user_agent text null,
      request_id text null,
      success boolean not null,
      metadata jsonb null,
      created_at timestamptz not null default now()
    );
  `);
  await pool.query(`
    create table if not exists lenders (
      id uuid primary key,
      name text not null,
      country text not null,
      submission_method text null,
      email text null,
      phone text null,
      website text null,
      postal_code text null,
      created_at timestamptz not null default now()
    );
  `);
  await pool.query(`
    create table if not exists lender_products (
      id uuid primary key,
      lender_id uuid not null references lenders(id) on delete cascade,
      name text not null,
      description text null,
      active boolean not null default true,
      required_documents jsonb not null default '[]'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `);
});

const twilioModule = require("twilio") as {
  __twilioMocks: unknown;
};

Object.assign(globalThis, { __twilioMocks: twilioModule.__twilioMocks });
