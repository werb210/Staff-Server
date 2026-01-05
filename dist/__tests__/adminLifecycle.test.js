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
const app = (0, index_1.buildApp)(index_1.defaultConfig);
const requestId = "test-request-id";
async function resetDb() {
    await db_1.pool.query("delete from client_submissions");
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
beforeAll(async () => {
    process.env.DATABASE_URL = "pg-mem";
    process.env.BUILD_TIMESTAMP = "2024-01-01T00:00:00.000Z";
    process.env.COMMIT_SHA = "test-commit";
    process.env.JWT_SECRET = "test-access-secret";
    process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
    process.env.JWT_EXPIRES_IN = "1h";
    process.env.JWT_REFRESH_EXPIRES_IN = "1d";
    process.env.LOGIN_LOCKOUT_THRESHOLD = "2";
    process.env.LOGIN_LOCKOUT_MINUTES = "10";
    process.env.PASSWORD_MAX_AGE_DAYS = "30";
    process.env.NODE_ENV = "test";
    await (0, migrations_1.runMigrations)();
});
beforeEach(async () => {
    await resetDb();
});
afterAll(async () => {
    await db_1.pool.end();
});
describe("admin lifecycle", () => {
    it("enforces admin-only access for user management", async () => {
        await (0, auth_service_1.createUserAccount)({
            email: "staff@example.com",
            password: "Password123!",
            role: roles_1.ROLES.STAFF,
        });
        const staffLogin = await (0, supertest_1.default)(app)
            .post("/api/auth/login")
            .set("x-request-id", requestId)
            .send({
            email: "staff@example.com",
            password: "Password123!",
        });
        const res = await (0, supertest_1.default)(app)
            .post("/api/users")
            .set("Authorization", `Bearer ${staffLogin.body.accessToken}`)
            .set("x-request-id", requestId)
            .send({
            email: "new@example.com",
            password: "Password123!",
            role: roles_1.ROLES.USER,
        });
        expect(res.status).toBe(403);
        expect(res.body.code).toBe("forbidden");
    });
    it("invalidates sessions on disable", async () => {
        const admin = await (0, auth_service_1.createUserAccount)({
            email: "admin@example.com",
            password: "Password123!",
            role: roles_1.ROLES.ADMIN,
        });
        const user = await (0, auth_service_1.createUserAccount)({
            email: "user@example.com",
            password: "Password123!",
            role: roles_1.ROLES.STAFF,
        });
        const adminLogin = await (0, supertest_1.default)(app)
            .post("/api/auth/login")
            .set("x-request-id", requestId)
            .send({
            email: admin.email,
            password: "Password123!",
        });
        const userLogin = await (0, supertest_1.default)(app)
            .post("/api/auth/login")
            .set("x-request-id", requestId)
            .send({
            email: user.email,
            password: "Password123!",
        });
        const disable = await (0, supertest_1.default)(app)
            .post(`/api/users/${user.id}/disable`)
            .set("Authorization", `Bearer ${adminLogin.body.accessToken}`)
            .set("x-request-id", requestId);
        expect(disable.status).toBe(200);
        const refresh = await (0, supertest_1.default)(app)
            .post("/api/auth/refresh")
            .set("x-request-id", requestId)
            .send({
            refreshToken: userLogin.body.refreshToken,
        });
        expect(refresh.status).toBe(401);
        expect(refresh.body.code).toBe("invalid_token");
        const me = await (0, supertest_1.default)(app)
            .get("/api/auth/me")
            .set("Authorization", `Bearer ${userLogin.body.accessToken}`);
        expect(me.status).toBe(403);
        expect(me.body.code).toBe("user_disabled");
    });
    it("records audit events for lifecycle actions", async () => {
        const admin = await (0, auth_service_1.createUserAccount)({
            email: "admin-audit@example.com",
            password: "Password123!",
            role: roles_1.ROLES.ADMIN,
        });
        const adminLogin = await (0, supertest_1.default)(app)
            .post("/api/auth/login")
            .set("x-request-id", requestId)
            .send({
            email: admin.email,
            password: "Password123!",
        });
        const created = await (0, supertest_1.default)(app)
            .post("/api/users")
            .set("Authorization", `Bearer ${adminLogin.body.accessToken}`)
            .set("x-request-id", requestId)
            .send({
            email: "audited@example.com",
            password: "Password123!",
            role: roles_1.ROLES.STAFF,
        });
        expect(created.status).toBe(201);
        const userId = created.body.user.id;
        const disable = await (0, supertest_1.default)(app)
            .post(`/api/users/${userId}/disable`)
            .set("Authorization", `Bearer ${adminLogin.body.accessToken}`)
            .set("x-request-id", requestId);
        expect(disable.status).toBe(200);
        const enable = await (0, supertest_1.default)(app)
            .post(`/api/users/${userId}/enable`)
            .set("Authorization", `Bearer ${adminLogin.body.accessToken}`)
            .set("x-request-id", requestId);
        expect(enable.status).toBe(200);
        const roleChange = await (0, supertest_1.default)(app)
            .post(`/api/users/${userId}/role`)
            .set("Authorization", `Bearer ${adminLogin.body.accessToken}`)
            .set("x-request-id", requestId)
            .send({ role: roles_1.ROLES.ADMIN });
        expect(roleChange.status).toBe(200);
        const audit = await db_1.pool.query(`select action
       from audit_events
       where target_user_id = $1
         and action in ('user_created', 'user_disabled', 'user_enabled', 'user_role_changed')
       order by created_at asc`, [userId]);
        expect(audit.rows.map((row) => row.action)).toEqual([
            "user_created",
            "user_disabled",
            "user_enabled",
            "user_role_changed",
        ]);
    });
});
