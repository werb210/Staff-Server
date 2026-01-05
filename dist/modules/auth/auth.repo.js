"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findAuthUserByEmail = findAuthUserByEmail;
exports.findAuthUserById = findAuthUserById;
exports.createUser = createUser;
exports.setUserActive = setUserActive;
exports.updatePassword = updatePassword;
exports.updateUserRole = updateUserRole;
exports.incrementTokenVersion = incrementTokenVersion;
exports.resetLoginFailures = resetLoginFailures;
exports.recordFailedLogin = recordFailedLogin;
exports.storeRefreshToken = storeRefreshToken;
exports.revokeRefreshToken = revokeRefreshToken;
exports.revokeRefreshTokensForUser = revokeRefreshTokensForUser;
exports.consumeRefreshToken = consumeRefreshToken;
exports.createPasswordReset = createPasswordReset;
exports.findPasswordReset = findPasswordReset;
exports.markPasswordResetUsed = markPasswordResetUsed;
const crypto_1 = require("crypto");
const db_1 = require("../../db");
async function findAuthUserByEmail(email) {
    const res = await db_1.pool.query(`select id, email, password_hash, role, active, password_changed_at, failed_login_attempts, locked_until, token_version
     from users
     where email = $1
     limit 1`, [email]);
    return res.rows[0] ?? null;
}
async function findAuthUserById(id) {
    const res = await db_1.pool.query(`select id, email, password_hash, role, active, password_changed_at, failed_login_attempts, locked_until, token_version
     from users
     where id = $1
     limit 1`, [id]);
    return res.rows[0] ?? null;
}
async function createUser(params) {
    const runner = params.client ?? db_1.pool;
    const res = await runner.query(`insert into users (id, email, password_hash, role, active, password_changed_at)
     values ($1, $2, $3, $4, true, now())
     returning id, email, password_hash, role, active, password_changed_at, failed_login_attempts, locked_until, token_version`, [(0, crypto_1.randomUUID)(), params.email, params.passwordHash, params.role]);
    return res.rows[0];
}
async function setUserActive(userId, active, client) {
    const runner = client ?? db_1.pool;
    await runner.query(`update users set active = $1 where id = $2`, [active, userId]);
}
async function updatePassword(userId, passwordHash, client) {
    const runner = client ?? db_1.pool;
    await runner.query(`update users set password_hash = $1, password_changed_at = now()
     where id = $2`, [passwordHash, userId]);
}
async function updateUserRole(userId, role, client) {
    const runner = client ?? db_1.pool;
    await runner.query(`update users set role = $1 where id = $2`, [
        role,
        userId,
    ]);
}
async function incrementTokenVersion(userId, client) {
    const runner = client ?? db_1.pool;
    await runner.query(`update users set token_version = token_version + 1 where id = $1`, [userId]);
}
async function resetLoginFailures(userId, client) {
    const runner = client ?? db_1.pool;
    await runner.query(`update users set failed_login_attempts = 0, locked_until = null where id = $1`, [userId]);
}
async function recordFailedLogin(userId, lockUntil, client) {
    const runner = client ?? db_1.pool;
    await runner.query(`update users
     set failed_login_attempts = failed_login_attempts + 1,
         locked_until = $2
     where id = $1`, [userId, lockUntil]);
}
async function storeRefreshToken(params) {
    const runner = params.client ?? db_1.pool;
    await runner.query(`insert into auth_refresh_tokens
     (id, user_id, token_hash, expires_at, revoked_at, created_at)
     values ($1, $2, $3, $4, null, now())`, [(0, crypto_1.randomUUID)(), params.userId, params.tokenHash, params.expiresAt]);
}
async function revokeRefreshToken(tokenHash, client) {
    const runner = client ?? db_1.pool;
    await runner.query(`update auth_refresh_tokens
     set revoked_at = now()
     where token_hash = $1 and revoked_at is null`, [tokenHash]);
}
async function revokeRefreshTokensForUser(userId, client) {
    const runner = client ?? db_1.pool;
    await runner.query(`update auth_refresh_tokens
     set revoked_at = now()
     where user_id = $1 and revoked_at is null`, [userId]);
}
async function consumeRefreshToken(tokenHash, client) {
    const runner = client ?? db_1.pool;
    const res = await runner.query(`update auth_refresh_tokens
     set revoked_at = now()
     where token_hash = $1 and revoked_at is null
     returning id, user_id, token_hash, expires_at, revoked_at`, [tokenHash]);
    return res.rows[0] ?? null;
}
async function createPasswordReset(params) {
    await db_1.pool.query(`insert into password_resets (id, user_id, token_hash, expires_at, used_at, created_at)
     values ($1, $2, $3, $4, null, now())`, [(0, crypto_1.randomUUID)(), params.userId, params.tokenHash, params.expiresAt]);
}
async function findPasswordReset(tokenHash) {
    const res = await db_1.pool.query(`select id, user_id, token_hash, expires_at, used_at
     from password_resets
     where token_hash = $1
     limit 1`, [tokenHash]);
    return res.rows[0] ?? null;
}
async function markPasswordResetUsed(id) {
    await db_1.pool.query(`update password_resets set used_at = now() where id = $1`, [id]);
}
