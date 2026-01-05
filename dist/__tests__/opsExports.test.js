"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const index_1 = require("../index");
const db_1 = require("../db");
const auth_service_1 = require("../modules/auth/auth.service");
const roles_1 = require("../auth/roles");
const migrations_1 = require("../migrations");
const audit_service_1 = require("../modules/audit/audit.service");
const app = (0, index_1.buildApp)(index_1.defaultConfig);
const requestId = "test-request-id";
async function resetDb() {
    await db_1.pool.query("delete from ops_replay_events");
    await db_1.pool.query("delete from ops_replay_jobs");
    await db_1.pool.query("delete from ops_kill_switches");
    await db_1.pool.query("delete from export_audit");
    await db_1.pool.query("delete from reporting_pipeline_daily_snapshots");
    await db_1.pool.query("delete from reporting_daily_metrics");
    await db_1.pool.query("delete from lender_submission_retries");
    await db_1.pool.query("delete from lender_submissions");
    await db_1.pool.query("delete from document_version_reviews");
    await db_1.pool.query("delete from document_versions");
    await db_1.pool.query("delete from documents");
    await db_1.pool.query("delete from applications");
    await db_1.pool.query("delete from idempotency_keys");
    await db_1.pool.query("delete from auth_refresh_tokens");
    await db_1.pool.query("delete from password_resets");
    await db_1.pool.query("delete from audit_events");
    await db_1.pool.query("delete from users where id <> 'client-submission-system'");
}
async function waitForJobCompletion(jobId) {
    for (let i = 0; i < 50; i += 1) {
        const result = await db_1.pool.query("select status from ops_replay_jobs where id = $1", [jobId]);
        const status = result.rows[0]?.status;
        if (status && status !== "queued" && status !== "running") {
            return status;
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error("replay_job_timeout");
}
beforeAll(async () => {
    process.env.DATABASE_URL = "pg-mem";
    process.env.BUILD_TIMESTAMP = "2024-01-01T00:00:00.000Z";
    process.env.COMMIT_SHA = "test-commit";
    process.env.JWT_SECRET = "test-access-secret";
    process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
    process.env.JWT_EXPIRES_IN = "1h";
    process.env.JWT_REFRESH_EXPIRES_IN = "1d";
    process.env.NODE_ENV = "test";
    await (0, migrations_1.runMigrations)();
});
beforeEach(async () => {
    await resetDb();
});
afterAll(async () => {
    await db_1.pool.end();
});
describe("ops + exports", () => {
    it("enforces admin-only access for ops routes", async () => {
        await (0, auth_service_1.createUserAccount)({
            email: "staff@example.com",
            password: "Password123!",
            role: roles_1.ROLES.STAFF,
        });
        const login = await (0, supertest_1.default)(app)
            .post("/api/auth/login")
            .set("x-request-id", requestId)
            .send({ email: "staff@example.com", password: "Password123!" });
        const res = await (0, supertest_1.default)(app)
            .get("/api/admin/ops/kill-switches")
            .set("Authorization", `Bearer ${login.body.accessToken}`)
            .set("x-request-id", requestId);
        expect(res.status).toBe(403);
        expect(res.body.code).toBe("forbidden");
    });
    it("enforces kill switch before exports", async () => {
        const admin = await (0, auth_service_1.createUserAccount)({
            email: "admin-exports@example.com",
            password: "Password123!",
            role: roles_1.ROLES.ADMIN,
        });
        const login = await (0, supertest_1.default)(app)
            .post("/api/auth/login")
            .set("x-request-id", requestId)
            .send({ email: admin.email, password: "Password123!" });
        await db_1.pool.query("insert into ops_kill_switches (key, enabled, updated_at) values ($1, true, now())", ["exports"]);
        const res = await (0, supertest_1.default)(app)
            .post("/api/admin/exports/pipeline")
            .set("Authorization", `Bearer ${login.body.accessToken}`)
            .set("x-request-id", requestId)
            .send({ format: "json" });
        expect(res.status).toBe(423);
        expect(res.body.code).toBe("ops_kill_switch");
        const audit = await db_1.pool.query("select count(*)::int as count from export_audit");
        expect(audit.rows[0].count).toBe(0);
    });
    it("streams CSV exports", async () => {
        const admin = await (0, auth_service_1.createUserAccount)({
            email: "admin-csv@example.com",
            password: "Password123!",
            role: roles_1.ROLES.ADMIN,
        });
        const login = await (0, supertest_1.default)(app)
            .post("/api/auth/login")
            .set("x-request-id", requestId)
            .send({ email: admin.email, password: "Password123!" });
        await db_1.pool.query(`insert into reporting_pipeline_daily_snapshots
       (id, snapshot_date, pipeline_state, application_count, created_at)
       values ($1, $2, $3, $4, now())`, ["snap-1", new Date("2024-01-05"), "UNDER_REVIEW", 5]);
        const res = await (0, supertest_1.default)(app)
            .post("/api/admin/exports/pipeline")
            .set("Authorization", `Bearer ${login.body.accessToken}`)
            .set("x-request-id", requestId)
            .send({ format: "csv" });
        expect(res.status).toBe(200);
        expect(res.headers["content-type"]).toContain("text/csv");
        expect(res.headers["transfer-encoding"]).toBe("chunked");
        expect(res.text.split("\n")[0]).toBe("snapshot_date,pipeline_state,application_count");
    });
    it("replay jobs are idempotent", async () => {
        const admin = await (0, auth_service_1.createUserAccount)({
            email: "admin-replay@example.com",
            password: "Password123!",
            role: roles_1.ROLES.ADMIN,
        });
        const login = await (0, supertest_1.default)(app)
            .post("/api/auth/login")
            .set("x-request-id", requestId)
            .send({ email: admin.email, password: "Password123!" });
        await (0, audit_service_1.recordAuditEvent)({
            actorUserId: admin.id,
            targetUserId: null,
            action: "test_event",
            success: true,
        });
        await (0, audit_service_1.recordAuditEvent)({
            actorUserId: admin.id,
            targetUserId: null,
            action: "test_event_two",
            success: true,
        });
        const targetIdsResult = await db_1.pool.query("select id from audit_events where action in ($1, $2)", ["test_event", "test_event_two"]);
        const targetIds = targetIdsResult.rows.map((row) => row.id);
        const first = await (0, supertest_1.default)(app)
            .post("/api/admin/ops/replay/audit_events")
            .set("Authorization", `Bearer ${login.body.accessToken}`)
            .set("x-request-id", requestId);
        const firstJobId = first.body.job.id;
        const firstStatus = await waitForJobCompletion(firstJobId);
        expect(firstStatus).toBe("completed");
        const countAfterFirst = await db_1.pool.query("select count(*)::int as count from ops_replay_events where source_table = 'audit_events' and source_id = any($1)", [targetIds]);
        const second = await (0, supertest_1.default)(app)
            .post("/api/admin/ops/replay/audit_events")
            .set("Authorization", `Bearer ${login.body.accessToken}`)
            .set("x-request-id", requestId);
        const secondJobId = second.body.job.id;
        const secondStatus = await waitForJobCompletion(secondJobId);
        expect(secondStatus).toBe("completed");
        const countAfterSecond = await db_1.pool.query("select count(*)::int as count from ops_replay_events where source_table = 'audit_events' and source_id = any($1)", [targetIds]);
        expect(countAfterFirst.rows[0].count).toBe(targetIds.length);
        expect(countAfterSecond.rows[0].count).toBe(targetIds.length);
    });
});
