import { beforeAll, beforeEach, afterAll, describe, expect, it } from "vitest";
import { pool } from "../db";
import { createUserAccount } from "../modules/auth/auth.service";
import { ROLES } from "../auth/roles";
import { createApplication } from "../modules/applications/applications.repo";
import { backfillApplications } from "../../scripts/backfillApplications";
import { randomUUID } from "crypto";

async function resetDb(): Promise<void> {
  await pool.query("delete from application_required_documents");
  await pool.query("delete from document_processing_jobs");
  await pool.query("delete from application_stage_events");
  await pool.query("delete from applications");
  await pool.query("delete from users");
}

describe("backfillApplications", () => {
  beforeAll(async () => {
    process.env.NODE_ENV = "test";
  });

  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await pool.end();
  });

  it("dry run performs no writes", async () => {
    const user = await createUserAccount({
      email: "dry-run@example.com",
      phoneNumber: "+14155550101",
      role: ROLES.ADMIN,
    });
    const application = await createApplication({
      ownerUserId: user.id,
      name: "Dry Run App",
      metadata: null,
      productType: "standard",
    });
    await pool.query(
      `update applications
       set current_stage = null,
           processing_stage = 'invalid'
       where id = $1`,
      [application.id]
    );

    await backfillApplications({ dryRun: true, verbose: false });

    const updated = await pool.query<{ current_stage: string | null }>(
      "select current_stage from applications where id = $1",
      [application.id]
    );
    expect(updated.rows[0]?.current_stage).toBeNull();
  });

  it("fills missing fields", async () => {
    const user = await createUserAccount({
      email: "backfill@example.com",
      phoneNumber: "+14155550102",
      role: ROLES.ADMIN,
    });
    const application = await createApplication({
      ownerUserId: user.id,
      name: "Backfill App",
      metadata: null,
      productType: "standard",
    });
    await pool.query(
      `update applications
       set current_stage = null,
           processing_stage = 'invalid'
       where id = $1`,
      [application.id]
    );
    await pool.query(
      `insert into document_processing_jobs
       (id, application_id, document_id, status, completed_at, created_at, updated_at)
       values ($1, $2, $3, 'completed', now(), now(), now())`,
      [randomUUID(), application.id, randomUUID()]
    );

    await backfillApplications({ dryRun: false, verbose: false });

    const updated = await pool.query<{ current_stage: string | null; processing_stage: string }>(
      "select current_stage, processing_stage from applications where id = $1",
      [application.id]
    );
    expect(updated.rows[0]?.current_stage).toBeTruthy();
    expect(updated.rows[0]?.processing_stage).toBe("pending");

    const requiredDocs = await pool.query(
      "select id from application_required_documents where application_id = $1",
      [application.id]
    );
    expect(requiredDocs.rows.length).toBeGreaterThan(0);
  });

  it("leaves valid records unchanged", async () => {
    const user = await createUserAccount({
      email: "valid@example.com",
      phoneNumber: "+14155550103",
      role: ROLES.ADMIN,
    });
    const application = await createApplication({
      ownerUserId: user.id,
      name: "Valid App",
      metadata: null,
      productType: "standard",
    });

    await backfillApplications({ dryRun: false, verbose: false });

    const updated = await pool.query<{ current_stage: string | null }>(
      "select current_stage from applications where id = $1",
      [application.id]
    );
    expect(updated.rows[0]?.current_stage).toBeTruthy();
  });
});
