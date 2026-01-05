"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const index_1 = require("../index");
const db_1 = require("../db");
const auth_service_1 = require("../modules/auth/auth.service");
const auth_repo_1 = require("../modules/auth/auth.repo");
const users_service_1 = require("../modules/users/users.service");
const rateLimit_1 = require("../middleware/rateLimit");
const roles_1 = require("../auth/roles");
const migrations_1 = require("../migrations");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const auth_1 = require("../middleware/auth");
const errors_1 = require("../middleware/errors");
const crypto_1 = require("crypto");
const app = (0, index_1.buildApp)(index_1.defaultConfig);
const requestId = "test-request-id";
const postWithRequestId = (url) => (0, supertest_1.default)(app).post(url).set("x-request-id", requestId);
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
    (0, rateLimit_1.resetLoginRateLimit)();
});
afterAll(async () => {
    await db_1.pool.end();
});
describe("auth", () => {
    it("logs in successfully", async () => {
        const user = await (0, auth_service_1.createUserAccount)({
            email: "admin@example.com",
            password: "Password123!",
            role: roles_1.ROLES.ADMIN,
        });
        const res = await postWithRequestId("/api/auth/login").send({
            email: "admin@example.com",
            password: "Password123!",
        });
        expect(res.status).toBe(200);
        expect(res.body.accessToken).toBeDefined();
        expect(res.body.refreshToken).toBeDefined();
        expect(res.body.user).toEqual({
            id: user.id,
            email: "admin@example.com",
            role: roles_1.ROLES.ADMIN,
        });
    });
    it("writes audit events for login success and failure", async () => {
        await (0, auth_service_1.createUserAccount)({
            email: "audit-login@example.com",
            password: "Password123!",
            role: roles_1.ROLES.USER,
        });
        const success = await postWithRequestId("/api/auth/login").send({
            email: "audit-login@example.com",
            password: "Password123!",
        });
        expect(success.status).toBe(200);
        const failure = await postWithRequestId("/api/auth/login").send({
            email: "audit-login@example.com",
            password: "WrongPassword!",
        });
        expect(failure.status).toBe(401);
        const res = await db_1.pool.query(`select action, success
       from audit_events
       where action = 'login'
       order by created_at asc`);
        expect(res.rows).toEqual([
            { action: "login", success: true },
            { action: "login", success: false },
        ]);
    });
    it("fails login with bad password", async () => {
        await (0, auth_service_1.createUserAccount)({
            email: "staff@example.com",
            password: "Password123!",
            role: roles_1.ROLES.STAFF,
        });
        const res = await postWithRequestId("/api/auth/login").send({
            email: "staff@example.com",
            password: "WrongPassword!",
        });
        expect(res.status).toBe(401);
        expect(res.body.code).toBe("invalid_credentials");
        expect(res.body.requestId).toBeDefined();
    });
    it("blocks login when password is expired", async () => {
        const user = await (0, auth_service_1.createUserAccount)({
            email: "expired@example.com",
            password: "Password123!",
            role: roles_1.ROLES.STAFF,
        });
        const expiredDate = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);
        await db_1.pool.query(`update users set password_changed_at = $1 where id = $2`, [
            expiredDate,
            user.id,
        ]);
        const res = await postWithRequestId("/api/auth/login").send({
            email: "expired@example.com",
            password: "Password123!",
        });
        expect(res.status).toBe(403);
        expect(res.body.code).toBe("password_expired");
    });
    it("blocks refresh when password is expired", async () => {
        const user = await (0, auth_service_1.createUserAccount)({
            email: "refresh-expired@example.com",
            password: "Password123!",
            role: roles_1.ROLES.STAFF,
        });
        const login = await postWithRequestId("/api/auth/login").send({
            email: "refresh-expired@example.com",
            password: "Password123!",
        });
        const expiredDate = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);
        await db_1.pool.query(`update users set password_changed_at = $1 where id = $2`, [
            expiredDate,
            user.id,
        ]);
        const refresh = await postWithRequestId("/api/auth/refresh").send({
            refreshToken: login.body.refreshToken,
        });
        expect(refresh.status).toBe(403);
        expect(refresh.body.code).toBe("password_expired");
    });
    it("fails login when user disabled", async () => {
        const user = await (0, auth_service_1.createUserAccount)({
            email: "disabled@example.com",
            password: "Password123!",
            role: roles_1.ROLES.STAFF,
        });
        await (0, users_service_1.setUserStatus)({
            userId: user.id,
            active: false,
            actorId: user.id,
        });
        const res = await postWithRequestId("/api/auth/login").send({
            email: "disabled@example.com",
            password: "Password123!",
        });
        expect(res.status).toBe(403);
        expect(res.body.code).toBe("user_disabled");
        expect(res.body.requestId).toBeDefined();
    });
    it("verifies access token", async () => {
        await (0, auth_service_1.createUserAccount)({
            email: "user@example.com",
            password: "Password123!",
            role: roles_1.ROLES.STAFF,
        });
        const login = await postWithRequestId("/api/auth/login").send({
            email: "user@example.com",
            password: "Password123!",
        });
        const token = login.body.accessToken;
        const res = await (0, supertest_1.default)(app)
            .get("/api/auth/me")
            .set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body.user.userId).toBeDefined();
        expect(res.body.user.role).toBe(roles_1.ROLES.STAFF);
    });
    it("enforces roles on staff route", async () => {
        await (0, auth_service_1.createUserAccount)({
            email: "staffer@example.com",
            password: "Password123!",
            role: roles_1.ROLES.STAFF,
        });
        const staffLogin = await postWithRequestId("/api/auth/login").send({
            email: "staffer@example.com",
            password: "Password123!",
        });
        const staffToken = staffLogin.body.accessToken;
        const staffRes = await (0, supertest_1.default)(app)
            .get("/api/staff/overview")
            .set("Authorization", `Bearer ${staffToken}`);
        expect(staffRes.status).toBe(200);
        const admin = await (0, auth_service_1.createUserAccount)({
            email: "admin2@example.com",
            password: "Password123!",
            role: roles_1.ROLES.ADMIN,
        });
        const adminLogin = await postWithRequestId("/api/auth/login").send({
            email: admin.email,
            password: "Password123!",
        });
        const adminToken = adminLogin.body.accessToken;
        const adminRes = await (0, supertest_1.default)(app)
            .get("/api/staff/overview")
            .set("Authorization", `Bearer ${adminToken}`);
        expect(adminRes.status).toBe(403);
        expect(adminRes.body.code).toBe("forbidden");
    });
    it("fails readiness when required env missing", async () => {
        const original = process.env.JWT_SECRET;
        delete process.env.JWT_SECRET;
        const res = await (0, supertest_1.default)(app).get("/api/_int/ready");
        expect(res.status).toBe(503);
        expect(res.body.code).toBe("service_unavailable");
        process.env.JWT_SECRET = original;
    });
    it("rotates refresh tokens", async () => {
        await (0, auth_service_1.createUserAccount)({
            email: "rotate@example.com",
            password: "Password123!",
            role: roles_1.ROLES.STAFF,
        });
        const login = await postWithRequestId("/api/auth/login").send({
            email: "rotate@example.com",
            password: "Password123!",
        });
        const refreshToken = login.body.refreshToken;
        const refresh = await postWithRequestId("/api/auth/refresh").send({
            refreshToken,
        });
        expect(refresh.status).toBe(200);
        expect(refresh.body.refreshToken).toBeDefined();
        expect(refresh.body.refreshToken).not.toBe(refreshToken);
        const refreshLatest = await postWithRequestId("/api/auth/refresh").send({
            refreshToken: refresh.body.refreshToken,
        });
        expect(refreshLatest.status).toBe(200);
        const reuseLatest = await postWithRequestId("/api/auth/refresh").send({
            refreshToken: refresh.body.refreshToken,
        });
        expect(reuseLatest.status).toBe(401);
        expect(reuseLatest.body.code).toBe("invalid_token");
    });
    it("rejects refresh token replay with audit entry", async () => {
        const user = await (0, auth_service_1.createUserAccount)({
            email: "replay@example.com",
            password: "Password123!",
            role: roles_1.ROLES.STAFF,
        });
        const login = await postWithRequestId("/api/auth/login").send({
            email: "replay@example.com",
            password: "Password123!",
        });
        const refreshToken = login.body.refreshToken;
        const refresh = await postWithRequestId("/api/auth/refresh").send({
            refreshToken,
        });
        expect(refresh.status).toBe(200);
        const replay = await postWithRequestId("/api/auth/refresh").send({
            refreshToken,
        });
        expect(replay.status).toBe(401);
        expect(replay.body.code).toBe("invalid_token");
        const audit = await db_1.pool.query(`select action, success, actor_user_id, target_user_id
       from audit_events
       where action = 'token_reuse'
       order by created_at desc
       limit 1`);
        expect(audit.rows[0]).toEqual({
            action: "token_reuse",
            success: false,
            actor_user_id: user.id,
            target_user_id: user.id,
        });
    });
    it("rejects revoked refresh tokens", async () => {
        await (0, auth_service_1.createUserAccount)({
            email: "logout@example.com",
            password: "Password123!",
            role: roles_1.ROLES.STAFF,
        });
        const login = await postWithRequestId("/api/auth/login").send({
            email: "logout@example.com",
            password: "Password123!",
        });
        const refreshToken = login.body.refreshToken;
        const logout = await postWithRequestId("/api/auth/logout")
            .set("Authorization", `Bearer ${login.body.accessToken}`)
            .send({ refreshToken });
        expect(logout.status).toBe(200);
        const refresh = await postWithRequestId("/api/auth/refresh").send({
            refreshToken,
        });
        expect(refresh.status).toBe(401);
        expect(refresh.body.code).toBe("invalid_token");
    });
    it("denies user admin access for staff", async () => {
        await (0, auth_service_1.createUserAccount)({
            email: "staff-access@example.com",
            password: "Password123!",
            role: roles_1.ROLES.STAFF,
        });
        const login = await postWithRequestId("/api/auth/login").send({
            email: "staff-access@example.com",
            password: "Password123!",
        });
        const res = await postWithRequestId("/api/users")
            .set("Authorization", `Bearer ${login.body.accessToken}`)
            .send({
            email: "newuser@example.com",
            password: "Password123!",
            role: roles_1.ROLES.STAFF,
        });
        expect(res.status).toBe(403);
        expect(res.body.code).toBe("forbidden");
    });
    it("allows admin user management", async () => {
        await (0, auth_service_1.createUserAccount)({
            email: "admin-manage@example.com",
            password: "Password123!",
            role: roles_1.ROLES.ADMIN,
        });
        const login = await postWithRequestId("/api/auth/login").send({
            email: "admin-manage@example.com",
            password: "Password123!",
        });
        const res = await postWithRequestId("/api/users")
            .set("Authorization", `Bearer ${login.body.accessToken}`)
            .send({
            email: "managed@example.com",
            password: "Password123!",
            role: roles_1.ROLES.STAFF,
        });
        expect(res.status).toBe(201);
        expect(res.body.user.email).toBe("managed@example.com");
        expect(res.body.user.role).toBe(roles_1.ROLES.STAFF);
    });
    it("rejects unauthorized role escalation attempts", async () => {
        const staff = await (0, auth_service_1.createUserAccount)({
            email: "self-role@example.com",
            password: "Password123!",
            role: roles_1.ROLES.STAFF,
        });
        const login = await postWithRequestId("/api/auth/login").send({
            email: "self-role@example.com",
            password: "Password123!",
        });
        const res = await postWithRequestId(`/api/users/${staff.id}/role`)
            .set("Authorization", `Bearer ${login.body.accessToken}`)
            .send({ role: roles_1.ROLES.ADMIN });
        expect(res.status).toBe(403);
        expect(res.body.code).toBe("forbidden");
    });
    it("denies access when roles are not declared", async () => {
        await (0, auth_service_1.createUserAccount)({
            email: "default-deny@example.com",
            password: "Password123!",
            role: roles_1.ROLES.STAFF,
        });
        const login = await postWithRequestId("/api/auth/login").send({
            email: "default-deny@example.com",
            password: "Password123!",
        });
        const protectedApp = (0, express_1.default)();
        protectedApp.use(express_1.default.json());
        protectedApp.get("/protected", auth_1.requireAuth, (0, auth_1.requireCapability)([]), (_req, res) => {
            res.json({ ok: true });
        });
        protectedApp.use(errors_1.errorHandler);
        const res = await (0, supertest_1.default)(protectedApp)
            .get("/protected")
            .set("Authorization", `Bearer ${login.body.accessToken}`);
        expect(res.status).toBe(403);
        expect(res.body.code).toBe("forbidden");
    });
    it("locks account after repeated failures", async () => {
        await (0, auth_service_1.createUserAccount)({
            email: "locked@example.com",
            password: "Password123!",
            role: roles_1.ROLES.STAFF,
        });
        const first = await postWithRequestId("/api/auth/login").send({
            email: "locked@example.com",
            password: "BadPassword!",
        });
        expect(first.status).toBe(401);
        const second = await postWithRequestId("/api/auth/login").send({
            email: "locked@example.com",
            password: "BadPassword!",
        });
        expect(second.status).toBe(401);
        const locked = await postWithRequestId("/api/auth/login").send({
            email: "locked@example.com",
            password: "Password123!",
        });
        expect(locked.status).toBe(423);
        expect(locked.body.code).toBe("account_locked");
    });
    it("invalidates tokens after password change", async () => {
        await (0, auth_service_1.createUserAccount)({
            email: "change@example.com",
            password: "Password123!",
            role: roles_1.ROLES.STAFF,
        });
        const login = await postWithRequestId("/api/auth/login").send({
            email: "change@example.com",
            password: "Password123!",
        });
        const change = await postWithRequestId("/api/auth/password-change")
            .set("Authorization", `Bearer ${login.body.accessToken}`)
            .send({ currentPassword: "Password123!", newPassword: "NewPassword123!" });
        expect(change.status).toBe(200);
        const refresh = await postWithRequestId("/api/auth/refresh").send({
            refreshToken: login.body.refreshToken,
        });
        expect(refresh.status).toBe(401);
        expect(refresh.body.code).toBe("invalid_token");
        const me = await (0, supertest_1.default)(app)
            .get("/api/auth/me")
            .set("Authorization", `Bearer ${login.body.accessToken}`);
        expect(me.status).toBe(401);
        expect(me.body.code).toBe("invalid_token");
    });
    it("invalidates tokens after role change", async () => {
        const admin = await (0, auth_service_1.createUserAccount)({
            email: "role-admin@example.com",
            password: "Password123!",
            role: roles_1.ROLES.ADMIN,
        });
        const staff = await (0, auth_service_1.createUserAccount)({
            email: "role-staff@example.com",
            password: "Password123!",
            role: roles_1.ROLES.STAFF,
        });
        const adminLogin = await postWithRequestId("/api/auth/login").send({
            email: admin.email,
            password: "Password123!",
        });
        const staffLogin = await postWithRequestId("/api/auth/login").send({
            email: staff.email,
            password: "Password123!",
        });
        const roleChange = await postWithRequestId(`/api/users/${staff.id}/role`)
            .set("Authorization", `Bearer ${adminLogin.body.accessToken}`)
            .send({ role: roles_1.ROLES.ADMIN });
        expect(roleChange.status).toBe(200);
        const refresh = await postWithRequestId("/api/auth/refresh").send({
            refreshToken: staffLogin.body.refreshToken,
        });
        expect(refresh.status).toBe(401);
        expect(refresh.body.code).toBe("invalid_token");
        const me = await (0, supertest_1.default)(app)
            .get("/api/auth/me")
            .set("Authorization", `Bearer ${staffLogin.body.accessToken}`);
        expect(me.status).toBe(401);
        expect(me.body.code).toBe("invalid_token");
    });
    it("revokes tokens after refresh and logout", async () => {
        await (0, auth_service_1.createUserAccount)({
            email: "cycle@example.com",
            password: "Password123!",
            role: roles_1.ROLES.STAFF,
        });
        const login = await postWithRequestId("/api/auth/login").send({
            email: "cycle@example.com",
            password: "Password123!",
        });
        const refreshed = await postWithRequestId("/api/auth/refresh").send({
            refreshToken: login.body.refreshToken,
        });
        expect(refreshed.status).toBe(200);
        const logout = await postWithRequestId("/api/auth/logout")
            .set("Authorization", `Bearer ${refreshed.body.accessToken}`)
            .send({ refreshToken: refreshed.body.refreshToken });
        expect(logout.status).toBe(200);
        const reuse = await postWithRequestId("/api/auth/refresh").send({
            refreshToken: refreshed.body.refreshToken,
        });
        expect(reuse.status).toBe(401);
        expect(reuse.body.code).toBe("invalid_token");
    });
    it("invalidates sessions after global logout", async () => {
        await (0, auth_service_1.createUserAccount)({
            email: "global@example.com",
            password: "Password123!",
            role: roles_1.ROLES.STAFF,
        });
        const login = await postWithRequestId("/api/auth/login").send({
            email: "global@example.com",
            password: "Password123!",
        });
        const logoutAll = await postWithRequestId("/api/auth/logout-all")
            .set("Authorization", `Bearer ${login.body.accessToken}`);
        expect(logoutAll.status).toBe(200);
        const refresh = await postWithRequestId("/api/auth/refresh").send({
            refreshToken: login.body.refreshToken,
        });
        expect(refresh.status).toBe(401);
        expect(refresh.body.code).toBe("invalid_token");
        const me = await (0, supertest_1.default)(app)
            .get("/api/auth/me")
            .set("Authorization", `Bearer ${login.body.accessToken}`);
        expect(me.status).toBe(401);
        expect(me.body.code).toBe("invalid_token");
    });
    it("blocks access for disabled users with existing tokens", async () => {
        const user = await (0, auth_service_1.createUserAccount)({
            email: "disabled-access@example.com",
            password: "Password123!",
            role: roles_1.ROLES.STAFF,
        });
        const login = await postWithRequestId("/api/auth/login").send({
            email: "disabled-access@example.com",
            password: "Password123!",
        });
        await (0, auth_repo_1.setUserActive)(user.id, false);
        const me = await (0, supertest_1.default)(app)
            .get("/api/auth/me")
            .set("Authorization", `Bearer ${login.body.accessToken}`);
        expect(me.status).toBe(403);
        expect(me.body.code).toBe("user_disabled");
    });
    it("handles password reset lifecycle", async () => {
        const admin = await (0, auth_service_1.createUserAccount)({
            email: "reset-admin@example.com",
            password: "Password123!",
            role: roles_1.ROLES.ADMIN,
        });
        const user = await (0, auth_service_1.createUserAccount)({
            email: "reset-user@example.com",
            password: "Password123!",
            role: roles_1.ROLES.STAFF,
        });
        const adminLogin = await postWithRequestId("/api/auth/login").send({
            email: admin.email,
            password: "Password123!",
        });
        const userLogin = await postWithRequestId("/api/auth/login").send({
            email: user.email,
            password: "Password123!",
        });
        const resetRequest = await postWithRequestId("/api/auth/password-reset/request")
            .set("Authorization", `Bearer ${adminLogin.body.accessToken}`)
            .send({ userId: user.id });
        expect(resetRequest.status).toBe(200);
        expect(resetRequest.body.token).toBeDefined();
        const confirm = await postWithRequestId("/api/auth/password-reset/confirm")
            .send({ token: resetRequest.body.token, newPassword: "NewPassword123!" });
        expect(confirm.status).toBe(200);
        const refresh = await postWithRequestId("/api/auth/refresh").send({
            refreshToken: userLogin.body.refreshToken,
        });
        expect(refresh.status).toBe(401);
        expect(refresh.body.code).toBe("invalid_token");
        const audit = await db_1.pool.query(`select action, success
       from audit_events
       where action in ('password_reset_requested', 'password_reset_completed')
       order by created_at asc`);
        expect(audit.rows).toEqual([
            { action: "password_reset_requested", success: true },
            { action: "password_reset_completed", success: true },
        ]);
    });
    it("rejects expired or reused reset tokens", async () => {
        const admin = await (0, auth_service_1.createUserAccount)({
            email: "reset-expired-admin@example.com",
            password: "Password123!",
            role: roles_1.ROLES.ADMIN,
        });
        const user = await (0, auth_service_1.createUserAccount)({
            email: "reset-expired-user@example.com",
            password: "Password123!",
            role: roles_1.ROLES.STAFF,
        });
        const adminLogin = await postWithRequestId("/api/auth/login").send({
            email: admin.email,
            password: "Password123!",
        });
        const resetRequest = await postWithRequestId("/api/auth/password-reset/request")
            .set("Authorization", `Bearer ${adminLogin.body.accessToken}`)
            .send({ userId: user.id });
        expect(resetRequest.status).toBe(200);
        const expiredHash = (0, crypto_1.createHash)("sha256")
            .update(resetRequest.body.token)
            .digest("hex");
        await db_1.pool.query(`update password_resets set expires_at = $1 where token_hash = $2`, [new Date(Date.now() - 60 * 1000), expiredHash]);
        const expired = await postWithRequestId("/api/auth/password-reset/confirm")
            .send({ token: resetRequest.body.token, newPassword: "OtherPass123!" });
        expect(expired.status).toBe(401);
        expect(expired.body.code).toBe("invalid_token");
        const freshRequest = await postWithRequestId("/api/auth/password-reset/request")
            .set("Authorization", `Bearer ${adminLogin.body.accessToken}`)
            .send({ userId: user.id });
        expect(freshRequest.status).toBe(200);
        const firstConfirm = await postWithRequestId("/api/auth/password-reset/confirm")
            .send({ token: freshRequest.body.token, newPassword: "OtherPass123!" });
        expect(firstConfirm.status).toBe(200);
        const reuse = await postWithRequestId("/api/auth/password-reset/confirm")
            .send({ token: freshRequest.body.token, newPassword: "OtherPass123!" });
        expect(reuse.status).toBe(401);
        expect(reuse.body.code).toBe("invalid_token");
    });
    it("fails startup when migrations are pending", async () => {
        const migrationPath = path_1.default.join(process.cwd(), "migrations", "999_pending_test.sql");
        fs_1.default.writeFileSync(migrationPath, "select 1;");
        try {
            await expect((0, index_1.initializeServer)(index_1.defaultConfig)).resolves.toBeUndefined();
            const res = await (0, supertest_1.default)(app).get("/api/_int/ready");
            expect(res.status).toBe(200);
            expect(res.body.ok).toBe(true);
        }
        finally {
            fs_1.default.unlinkSync(migrationPath);
        }
    });
});
