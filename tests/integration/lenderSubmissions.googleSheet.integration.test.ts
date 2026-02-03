import { randomUUID } from "crypto";
import { pool } from "../../src/db";
import { createUserAccount } from "../../src/modules/auth/auth.service";
import { ROLES } from "../../src/auth/roles";
import { SubmissionRouter } from "../../src/modules/lenderSubmissions/SubmissionRouter";
import { submitApplication } from "../../src/modules/lender/lender.service";

const submitMock = jest.fn();

jest.mock("../../src/modules/lenderSubmissions/SubmissionRouter", () => ({
  SubmissionRouter: jest.fn().mockImplementation(() => ({
    submit: submitMock,
  })),
}));

let phoneCounter = 1400;
const nextPhone = (): string => `+1415555${String(phoneCounter++).padStart(4, "0")}`;

async function seedLenderProduct(): Promise<{ lenderId: string; lenderProductId: string }> {
  const lenderId = randomUUID();
  const lenderProductId = randomUUID();
  const mapping = {
    "Application ID": "application.id",
    "Applicant First Name": "application.metadata.applicant.firstName",
  };
  await pool.query(
    `insert into lenders (id, name, country, submission_method, submission_email, google_sheet_id, google_sheet_tab, google_sheet_mapping, active, status, created_at, updated_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, true, 'ACTIVE', now(), now())`,
    [
      lenderId,
      "Merchant Growth",
      "US",
      "GOOGLE_SHEETS",
      null,
      "sheet-123",
      "Sheet1",
      mapping,
    ]
  );
  await pool.query(
    `insert into lender_products
     (id, lender_id, name, category, country, rate_type, interest_min, interest_max, term_min, term_max, term_unit, active, required_documents, created_at, updated_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'MONTHS', $11, $12, now(), now())`,
    [
      lenderProductId,
      lenderId,
      "Standard Product",
      "LOC",
      "US",
      "FIXED",
      "8.5",
      "12.5",
      6,
      24,
      true,
      JSON.stringify([
        { type: "bank_statement", months: 6 },
        { type: "id_document", required: true },
      ]),
    ]
  );
  return { lenderId, lenderProductId };
}

async function resetDb(): Promise<void> {
  const tables = [
    "client_submissions",
    "lender_submission_retries",
    "lender_submissions",
    "ops_kill_switches",
    "document_version_reviews",
    "document_versions",
    "documents",
    "applications",
    "idempotency_keys",
    "otp_verifications",
    "auth_refresh_tokens",
    "password_resets",
    "audit_events",
  ];
  for (const table of tables) {
    try {
      await pool.query(`delete from ${table}`);
    } catch {
      // ignore missing tables in pg-mem
    }
  }
  await pool.query("delete from users where id <> '00000000-0000-0000-0000-000000000001'");
}

async function seedApplicationWithDocuments(params: {
  lenderId: string;
  lenderProductId: string;
  ownerUserId: string;
}): Promise<string> {
  const applicationId = randomUUID();
  await pool.query(
    `insert into applications
     (id, owner_user_id, name, metadata, product_type, pipeline_state, lender_id, lender_product_id, created_at, updated_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, now(), now())`,
    [
      applicationId,
      params.ownerUserId,
      "Lender Application",
      { applicant: { firstName: "Jane" }, business: { legalName: "Biz" } },
      "standard",
      "IN_REVIEW",
      params.lenderId,
      params.lenderProductId,
    ]
  );

  const bankDocumentId = randomUUID();
  const bankVersionId = randomUUID();
  await pool.query(
    `insert into documents (id, application_id, owner_user_id, title, document_type, status, created_at)
     values ($1, $2, $3, $4, $5, $6, now())`,
    [bankDocumentId, applicationId, params.ownerUserId, "Bank Statement", "bank_statement", "accepted"]
  );
  await pool.query(
    `insert into document_versions (id, document_id, version, metadata, content, created_at)
     values ($1, $2, $3, $4, $5, now())`,
    [bankVersionId, bankDocumentId, 1, { fileName: "bank.pdf" }, "base64data"]
  );
  await pool.query(
    `insert into document_version_reviews (id, document_version_id, status, reviewed_by_user_id, reviewed_at)
     values ($1, $2, $3, $4, now())`,
    [randomUUID(), bankVersionId, "accepted", params.ownerUserId]
  );

  const idDocumentId = randomUUID();
  const idVersionId = randomUUID();
  await pool.query(
    `insert into documents (id, application_id, owner_user_id, title, document_type, status, created_at)
     values ($1, $2, $3, $4, $5, $6, now())`,
    [idDocumentId, applicationId, params.ownerUserId, "ID", "id_document", "accepted"]
  );
  await pool.query(
    `insert into document_versions (id, document_id, version, metadata, content, created_at)
     values ($1, $2, $3, $4, $5, now())`,
    [idVersionId, idDocumentId, 1, { fileName: "id.pdf" }, "iddata"]
  );
  await pool.query(
    `insert into document_version_reviews (id, document_version_id, status, reviewed_by_user_id, reviewed_at)
     values ($1, $2, $3, $4, now())`,
    [randomUUID(), idVersionId, "accepted", params.ownerUserId]
  );

  return applicationId;
}

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  await pool.query(`
    create table if not exists applications (
      id uuid primary key,
      owner_user_id uuid null references users(id) on delete set null,
      name text not null,
      metadata jsonb null,
      product_type text not null,
      pipeline_state text not null,
      status text not null default 'RECEIVED',
      lender_id uuid null,
      lender_product_id uuid null,
      requested_amount integer null,
      source text null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `);
  await pool.query(`
    create table if not exists documents (
      id uuid primary key,
      application_id uuid not null references applications(id) on delete cascade,
      owner_user_id uuid null,
      title text not null,
      document_type text not null,
      status text not null default 'uploaded',
      created_at timestamptz not null default now()
    );
  `);
  await pool.query(`
    create table if not exists document_versions (
      id uuid primary key,
      document_id uuid not null references documents(id) on delete cascade,
      version integer not null,
      metadata jsonb null,
      content text not null,
      created_at timestamptz not null default now()
    );
  `);
  await pool.query(`
    create table if not exists document_version_reviews (
      id uuid primary key,
      document_version_id uuid not null references document_versions(id) on delete cascade,
      status text not null,
      reviewed_by_user_id uuid null,
      reviewed_at timestamptz not null default now()
    );
  `);
  await pool.query(`
    create table if not exists lender_submissions (
      id uuid primary key,
      application_id uuid not null references applications(id) on delete cascade,
      status text not null,
      idempotency_key text null,
      lender_id uuid not null references lenders(id) on delete cascade,
      submission_method text null,
      submitted_at timestamptz null,
      payload jsonb null,
      payload_hash text null,
      lender_response jsonb null,
      response_received_at timestamptz null,
      failure_reason text null,
      external_reference text null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `);
  await pool.query(`
    create table if not exists lender_submission_retries (
      id uuid primary key,
      submission_id uuid not null references lender_submissions(id) on delete cascade,
      status text not null,
      attempt_count integer not null default 0,
      next_attempt_at timestamptz null,
      last_error text null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      canceled_at timestamptz null
    );
  `);
  await pool.query(`
    create table if not exists ops_kill_switches (
      key text primary key,
      enabled boolean not null default false,
      updated_at timestamptz not null default now()
    );
  `);
});

beforeEach(async () => {
  await resetDb();
  phoneCounter = 1400;
  submitMock.mockResolvedValue({
    success: true,
    response: { status: "appended", receivedAt: new Date().toISOString() },
    failureReason: null,
    retryable: false,
  });
});

afterAll(async () => {
  await pool.end();
});

describe("google sheets submission routing", () => {
  it("routes submissions to the Google Sheets adapter", async () => {
    const staffPhone = nextPhone();
    const staffUser = await createUserAccount({
      email: "lender@apps.com",
      phoneNumber: staffPhone,
      role: ROLES.STAFF,
    });

    const { lenderId, lenderProductId } = await seedLenderProduct();
    const applicationId = await seedApplicationWithDocuments({
      lenderId,
      lenderProductId,
      ownerUserId: staffUser.id,
    });

    const submission = await submitApplication({
      applicationId,
      idempotencyKey: null,
      lenderId,
      lenderProductId,
      actorUserId: staffUser.id,
    });

    expect(submission.statusCode).toBe(201);
    expect(submission.value.status).toBe("sent");
    expect(submitMock).toHaveBeenCalledTimes(1);
    expect(SubmissionRouter).toHaveBeenCalledTimes(1);
  });

  it("blocks duplicate submissions for the same application", async () => {
    const staffPhone = nextPhone();
    const staffUser = await createUserAccount({
      email: "lender2@apps.com",
      phoneNumber: staffPhone,
      role: ROLES.STAFF,
    });

    const { lenderId, lenderProductId } = await seedLenderProduct();
    const applicationId = await seedApplicationWithDocuments({
      lenderId,
      lenderProductId,
      ownerUserId: staffUser.id,
    });

    const first = await submitApplication({
      applicationId,
      idempotencyKey: null,
      lenderId,
      lenderProductId,
      actorUserId: staffUser.id,
    });
    const second = await submitApplication({
      applicationId,
      idempotencyKey: null,
      lenderId,
      lenderProductId,
      actorUserId: staffUser.id,
    });

    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(200);
    expect(second.idempotent).toBe(true);
    expect(submitMock).toHaveBeenCalledTimes(1);
  });
});
