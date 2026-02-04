import { pool } from "../../db";

export async function ensureOcrTestSchema(): Promise<void> {
  await pool.query(`
    create table if not exists applications (
      id text primary key,
      owner_user_id text null,
      name text not null,
      metadata jsonb null,
      product_type text not null,
      pipeline_state text null,
      lender_id text null,
      lender_product_id text null,
      requested_amount numeric null,
      source text null,
      status text null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `);
  await pool.query(`
    create table if not exists documents (
      id text primary key,
      application_id text not null references applications(id) on delete cascade,
      owner_user_id text null,
      title text not null,
      document_type text not null,
      status text not null default 'uploaded',
      created_at timestamptz not null default now()
    );
  `);
  await pool.query(`
    create table if not exists document_versions (
      id text primary key,
      document_id text not null references documents(id) on delete cascade,
      version integer not null,
      metadata jsonb not null,
      content text not null,
      created_at timestamptz not null default now()
    );
  `);
  await pool.query(`
    create table if not exists document_version_reviews (
      id text primary key,
      document_version_id text not null references document_versions(id) on delete cascade,
      status text not null,
      reviewed_by_user_id text null,
      reviewed_at timestamptz not null default now()
    );
  `);
  await pool.query(`
    create table if not exists ocr_jobs (
      id text primary key,
      document_id text not null references documents(id) on delete cascade,
      application_id text not null references applications(id) on delete cascade,
      status text not null,
      attempt_count integer not null,
      max_attempts integer not null,
      next_attempt_at timestamp null,
      locked_at timestamp null,
      locked_by text null,
      last_error text null,
      created_at timestamp not null,
      updated_at timestamp not null,
      unique (document_id)
    );
  `);
  await pool.query(`
    create unique index if not exists ocr_jobs_document_id_unique
      on ocr_jobs (document_id);
  `);
  await pool.query(`
    create table if not exists ocr_document_results (
      id text primary key,
      document_id text not null references documents(id) on delete cascade,
      provider text not null,
      model text not null,
      extracted_text text not null,
      extracted_json jsonb null,
      meta jsonb null,
      created_at timestamp not null,
      updated_at timestamp not null,
      unique (document_id)
    );
  `);
  await pool.query(`
    create unique index if not exists ocr_document_results_document_id_unique
      on ocr_document_results (document_id);
  `);
  await pool.query(`
    create table if not exists ocr_results (
      id text primary key,
      application_id text not null references applications(id) on delete cascade,
      document_id text not null references documents(id) on delete cascade,
      field_key text not null,
      value text not null,
      confidence numeric not null,
      source_document_type text null,
      created_at timestamptz not null default now()
    );
  `);
  await pool.query(`
    create table if not exists notifications (
      id text primary key,
      user_id text null,
      application_id text null,
      type text not null,
      title text not null,
      body text not null,
      metadata jsonb null,
      created_at timestamptz not null default now(),
      read_at timestamptz null
    );
  `);
}

export async function resetOcrTestSchema(): Promise<void> {
  await pool.query("delete from ocr_results");
  await pool.query("delete from ocr_document_results");
  await pool.query("delete from ocr_jobs");
  await pool.query("delete from notifications");
  await pool.query("delete from document_version_reviews");
  await pool.query("delete from document_versions");
  await pool.query("delete from documents");
  await pool.query("delete from applications");
}
