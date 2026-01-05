"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertAuthSubsystem = assertAuthSubsystem;
exports.loginUser = loginUser;
exports.refreshSession = refreshSession;
exports.logoutUser = logoutUser;
exports.logoutAll = logoutAll;
exports.createUserAccount = createUserAccount;
exports.changePassword = changePassword;
exports.requestPasswordReset = requestPasswordReset;
exports.confirmPasswordReset = confirmPasswordReset;
exports.unlockUserAccount = unlockUserAccount;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = require("crypto");
const auth_repo_1 = require("./auth.repo");
const config_1 = require("../../config");
const errors_1 = require("../../middleware/errors");
const audit_service_1 = require("../audit/audit.service");
const db_1 = require("../../db");
function hashToken(token) {
    return (0, crypto_1.createHash)("sha256").update(token).digest("hex");
}
function timingSafeTokenCompare(a, b) {
    const aBuf = Buffer.from(a);
    const bBuf = Buffer.from(b);
    if (aBuf.length !== bBuf.length) {
        return false;
    }
    return (0, crypto_1.timingSafeEqual)(aBuf, bBuf);
}
function isPasswordExpired(passwordChangedAt) {
    const maxAgeDays = (0, config_1.getPasswordMaxAgeDays)();
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
    return passwordChangedAt.getTime() < Date.now() - maxAgeMs;
}
async function handleRefreshReuse(userId, ip, userAgent) {
    await (0, auth_repo_1.revokeRefreshTokensForUser)(userId);
    await (0, auth_repo_1.incrementTokenVersion)(userId);
    await (0, audit_service_1.recordAuditEvent)({
        action: "token_revoke",
        actorUserId: userId,
        targetUserId: userId,
        ip,
        userAgent,
        success: true,
    });
    await (0, audit_service_1.recordAuditEvent)({
        action: "token_reuse",
        actorUserId: userId,
        targetUserId: userId,
        ip,
        userAgent,
        success: false,
    });
}
function issueAccessToken(payload) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new errors_1.AppError("auth_misconfigured", "Auth is not configured.", 503);
    }
    const options = {
        expiresIn: (0, config_1.getAccessTokenExpiresIn)(),
    };
    return jsonwebtoken_1.default.sign(payload, secret, options);
}
function issueRefreshToken(payload) {
    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) {
        throw new errors_1.AppError("auth_misconfigured", "Auth is not configured.", 503);
    }
    const options = {
        expiresIn: (0, config_1.getRefreshTokenExpiresIn)(),
    };
    const refreshPayload = {
        ...payload,
        tokenId: (0, crypto_1.randomBytes)(16).toString("hex"),
    };
    return jsonwebtoken_1.default.sign(refreshPayload, secret, options);
}
function assertAuthSubsystem() {
    const accessSecret = process.env.JWT_SECRET;
    const refreshSecret = process.env.JWT_REFRESH_SECRET;
    if (!accessSecret || !refreshSecret) {
        throw new errors_1.AppError("auth_misconfigured", "Auth is not configured.", 503);
    }
    if (accessSecret === refreshSecret) {
        throw new errors_1.AppError("auth_misconfigured", "Auth secrets must be distinct.", 503);
    }
}
async function loginUser(email, password, ip, userAgent) {
    const user = await (0, auth_repo_1.findAuthUserByEmail)(email);
    if (!user || !user.password_hash || !user.role || !user.email) {
        await (0, audit_service_1.recordAuditEvent)({
            action: "login",
            actorUserId: user?.id ?? null,
            targetUserId: user?.id ?? null,
            ip,
            userAgent,
            success: false,
        });
        throw new errors_1.AppError("invalid_credentials", "Invalid email or password.", 401);
    }
    if (!user.active) {
        await (0, audit_service_1.recordAuditEvent)({
            action: "login",
            actorUserId: user.id,
            targetUserId: user.id,
            ip,
            userAgent,
            success: false,
        });
        throw new errors_1.AppError("user_disabled", "User is disabled.", 403);
    }
    const now = Date.now();
    if (user.locked_until && user.locked_until.getTime() > now) {
        await (0, audit_service_1.recordAuditEvent)({
            action: "login",
            actorUserId: user.id,
            targetUserId: user.id,
            ip,
            userAgent,
            success: false,
        });
        throw new errors_1.AppError("account_locked", "Account is locked. Try again later.", 423);
    }
    if (user.locked_until && user.locked_until.getTime() <= now) {
        await (0, auth_repo_1.resetLoginFailures)(user.id);
    }
    const ok = await bcryptjs_1.default.compare(password, user.password_hash);
    if (!ok) {
        const lockoutThreshold = (0, config_1.getLoginLockoutThreshold)();
        const lockoutMinutes = (0, config_1.getLoginLockoutMinutes)();
        const nextFailures = user.failed_login_attempts + 1;
        const shouldLock = nextFailures >= lockoutThreshold;
        const lockMultiplier = shouldLock
            ? Math.max(1, Math.ceil(nextFailures / lockoutThreshold))
            : 0;
        const lockUntil = shouldLock
            ? new Date(Date.now() + lockoutMinutes * lockMultiplier * 60 * 1000)
            : null;
        await (0, auth_repo_1.recordFailedLogin)(user.id, lockUntil);
        if (shouldLock) {
            await (0, audit_service_1.recordAuditEvent)({
                action: "account_lockout",
                actorUserId: user.id,
                targetUserId: user.id,
                ip,
                userAgent,
                success: true,
            });
        }
        await (0, audit_service_1.recordAuditEvent)({
            action: "login",
            actorUserId: user.id,
            targetUserId: user.id,
            ip,
            userAgent,
            success: false,
        });
        throw new errors_1.AppError("invalid_credentials", "Invalid email or password.", 401);
    }
    await (0, auth_repo_1.resetLoginFailures)(user.id);
    if (isPasswordExpired(user.password_changed_at)) {
        await (0, audit_service_1.recordAuditEvent)({
            action: "login",
            actorUserId: user.id,
            targetUserId: user.id,
            ip,
            userAgent,
            success: false,
        });
        throw new errors_1.AppError("password_expired", "Password has expired. Reset your password.", 403);
    }
    const payload = {
        userId: user.id,
        role: user.role,
        tokenVersion: user.token_version,
    };
    const accessToken = issueAccessToken(payload);
    const refreshToken = issueRefreshToken(payload);
    const tokenHash = hashToken(refreshToken);
    const refreshExpires = new Date();
    refreshExpires.setSeconds(refreshExpires.getSeconds() + msToSeconds((0, config_1.getRefreshTokenExpiresIn)()));
    await (0, auth_repo_1.revokeRefreshTokensForUser)(user.id);
    await (0, audit_service_1.recordAuditEvent)({
        action: "token_revoke",
        actorUserId: user.id,
        targetUserId: user.id,
        ip,
        userAgent,
        success: true,
    });
    await (0, auth_repo_1.storeRefreshToken)({
        userId: user.id,
        tokenHash,
        expiresAt: refreshExpires,
    });
    await (0, audit_service_1.recordAuditEvent)({
        action: "login",
        actorUserId: user.id,
        targetUserId: user.id,
        ip,
        userAgent,
        success: true,
    });
    return {
        accessToken,
        refreshToken,
        user: {
            id: user.id,
            email: user.email,
            role: user.role,
        },
    };
}
async function refreshSession(refreshToken, ip, userAgent) {
    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) {
        throw new errors_1.AppError("auth_misconfigured", "Auth is not configured.", 503);
    }
    const decoded = jsonwebtoken_1.default.decode(refreshToken);
    const actorUserId = decoded?.userId ?? null;
    try {
        const payload = jsonwebtoken_1.default.verify(refreshToken, secret);
        if (!payload.userId ||
            !payload.role ||
            typeof payload.tokenVersion !== "number" ||
            !payload.tokenId) {
            throw new errors_1.AppError("invalid_token", "Invalid refresh token.", 401);
        }
        const client = await db_1.pool.connect();
        try {
            await client.query("begin");
            const tokenHash = hashToken(refreshToken);
            const record = await (0, auth_repo_1.consumeRefreshToken)(tokenHash, client);
            if (!record) {
                await client.query("rollback");
                await handleRefreshReuse(payload.userId, ip, userAgent);
                throw new errors_1.AppError("invalid_token", "Invalid refresh token.", 401);
            }
            if (record.user_id !== payload.userId) {
                await client.query("commit");
                await handleRefreshReuse(payload.userId, ip, userAgent);
                throw new errors_1.AppError("invalid_token", "Invalid refresh token.", 401);
            }
            if (record.expires_at.getTime() < Date.now()) {
                await client.query("commit");
                throw new errors_1.AppError("invalid_token", "Invalid refresh token.", 401);
            }
            const user = await (0, auth_repo_1.findAuthUserById)(payload.userId);
            if (!user || !user.active) {
                await client.query("commit");
                throw new errors_1.AppError("invalid_token", "Invalid refresh token.", 401);
            }
            if (isPasswordExpired(user.password_changed_at)) {
                await client.query("commit");
                throw new errors_1.AppError("password_expired", "Password has expired. Reset your password.", 403);
            }
            if (user.token_version !== payload.tokenVersion) {
                await client.query("commit");
                throw new errors_1.AppError("invalid_token", "Invalid refresh token.", 401);
            }
            const newAccessToken = issueAccessToken({
                userId: user.id,
                role: user.role,
                tokenVersion: user.token_version,
            });
            const newRefreshToken = issueRefreshToken({
                userId: user.id,
                role: user.role,
                tokenVersion: user.token_version,
            });
            const newHash = hashToken(newRefreshToken);
            const refreshExpires = new Date();
            refreshExpires.setSeconds(refreshExpires.getSeconds() + msToSeconds((0, config_1.getRefreshTokenExpiresIn)()));
            await (0, auth_repo_1.storeRefreshToken)({
                userId: user.id,
                tokenHash: newHash,
                expiresAt: refreshExpires,
                client,
            });
            await (0, audit_service_1.recordAuditEvent)({
                action: "token_refresh",
                actorUserId: user.id,
                targetUserId: user.id,
                ip,
                userAgent,
                success: true,
                client,
            });
            await client.query("commit");
            return { accessToken: newAccessToken, refreshToken: newRefreshToken };
        }
        catch (err) {
            try {
                await client.query("rollback");
            }
            catch {
                // ignore rollback errors
            }
            throw err;
        }
        finally {
            client.release();
        }
    }
    catch (err) {
        await (0, audit_service_1.recordAuditEvent)({
            action: "token_refresh",
            actorUserId,
            targetUserId: actorUserId,
            ip,
            userAgent,
            success: false,
        });
        throw err;
    }
}
async function logoutUser(params) {
    const tokenHash = hashToken(params.refreshToken);
    await (0, auth_repo_1.revokeRefreshToken)(tokenHash);
    await (0, audit_service_1.recordAuditEvent)({
        action: "token_revoke",
        actorUserId: params.userId,
        targetUserId: params.userId,
        ip: params.ip,
        userAgent: params.userAgent,
        success: true,
    });
    await (0, audit_service_1.recordAuditEvent)({
        action: "logout",
        actorUserId: params.userId,
        targetUserId: params.userId,
        ip: params.ip,
        userAgent: params.userAgent,
        success: true,
    });
}
async function logoutAll(params) {
    await (0, auth_repo_1.revokeRefreshTokensForUser)(params.userId);
    await (0, auth_repo_1.incrementTokenVersion)(params.userId);
    await (0, audit_service_1.recordAuditEvent)({
        action: "token_revoke",
        actorUserId: params.userId,
        targetUserId: params.userId,
        ip: params.ip,
        userAgent: params.userAgent,
        success: true,
    });
    await (0, audit_service_1.recordAuditEvent)({
        action: "logout_all",
        actorUserId: params.userId,
        targetUserId: params.userId,
        ip: params.ip,
        userAgent: params.userAgent,
        success: true,
    });
}
async function createUserAccount(params) {
    const client = await db_1.pool.connect();
    try {
        await client.query("begin");
        const passwordHash = await bcryptjs_1.default.hash(params.password, 12);
        const user = await (0, auth_repo_1.createUser)({
            email: params.email,
            passwordHash,
            role: params.role,
            client,
        });
        await (0, audit_service_1.recordAuditEvent)({
            action: "user_created",
            actorUserId: params.actorUserId ?? null,
            targetUserId: user.id,
            ip: params.ip,
            userAgent: params.userAgent,
            success: true,
            client,
        });
        await client.query("commit");
        return { id: user.id, email: user.email, role: user.role };
    }
    catch (err) {
        await client.query("rollback");
        await (0, audit_service_1.recordAuditEvent)({
            action: "user_created",
            actorUserId: params.actorUserId ?? null,
            targetUserId: null,
            ip: params.ip,
            userAgent: params.userAgent,
            success: false,
        });
        throw err;
    }
    finally {
        client.release();
    }
}
async function changePassword(params) {
    const user = await (0, auth_repo_1.findAuthUserById)(params.userId);
    if (!user || !user.password_hash) {
        await (0, audit_service_1.recordAuditEvent)({
            action: "password_change",
            actorUserId: params.userId,
            targetUserId: params.userId,
            ip: params.ip,
            userAgent: params.userAgent,
            success: false,
        });
        throw new errors_1.AppError("invalid_credentials", "Invalid credentials.", 401);
    }
    const ok = await bcryptjs_1.default.compare(params.currentPassword, user.password_hash);
    if (!ok) {
        await (0, audit_service_1.recordAuditEvent)({
            action: "password_change",
            actorUserId: params.userId,
            targetUserId: params.userId,
            ip: params.ip,
            userAgent: params.userAgent,
            success: false,
        });
        throw new errors_1.AppError("invalid_credentials", "Invalid credentials.", 401);
    }
    const client = await db_1.pool.connect();
    try {
        await client.query("begin");
        const passwordHash = await bcryptjs_1.default.hash(params.newPassword, 12);
        await (0, auth_repo_1.updatePassword)(params.userId, passwordHash, client);
        await (0, auth_repo_1.incrementTokenVersion)(params.userId, client);
        await (0, auth_repo_1.revokeRefreshTokensForUser)(params.userId, client);
        await (0, audit_service_1.recordAuditEvent)({
            action: "token_revoke",
            actorUserId: params.userId,
            targetUserId: params.userId,
            ip: params.ip,
            userAgent: params.userAgent,
            success: true,
            client,
        });
        await (0, audit_service_1.recordAuditEvent)({
            action: "password_change",
            actorUserId: params.userId,
            targetUserId: params.userId,
            ip: params.ip,
            userAgent: params.userAgent,
            success: true,
            client,
        });
        await client.query("commit");
    }
    catch (err) {
        await client.query("rollback");
        await (0, audit_service_1.recordAuditEvent)({
            action: "password_change",
            actorUserId: params.userId,
            targetUserId: params.userId,
            ip: params.ip,
            userAgent: params.userAgent,
            success: false,
        });
        throw err;
    }
    finally {
        client.release();
    }
}
async function requestPasswordReset(params) {
    const token = (0, crypto_1.randomBytes)(32).toString("hex");
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await (0, auth_repo_1.createPasswordReset)({ userId: params.userId, tokenHash, expiresAt });
    await (0, audit_service_1.recordAuditEvent)({
        action: "password_reset_requested",
        actorUserId: params.actorUserId ?? null,
        targetUserId: params.userId,
        ip: params.ip,
        userAgent: params.userAgent,
        success: true,
    });
    return token;
}
async function confirmPasswordReset(params) {
    const tokenHash = hashToken(params.token);
    const record = await (0, auth_repo_1.findPasswordReset)(tokenHash);
    if (!record || record.used_at || record.expires_at.getTime() < Date.now()) {
        await (0, audit_service_1.recordAuditEvent)({
            action: "password_reset_completed",
            actorUserId: null,
            targetUserId: record?.user_id ?? null,
            ip: params.ip,
            userAgent: params.userAgent,
            success: false,
        });
        throw new errors_1.AppError("invalid_token", "Invalid reset token.", 401);
    }
    if (!timingSafeTokenCompare(record.token_hash, tokenHash)) {
        await (0, audit_service_1.recordAuditEvent)({
            action: "password_reset_completed",
            actorUserId: null,
            targetUserId: record.user_id,
            ip: params.ip,
            userAgent: params.userAgent,
            success: false,
        });
        throw new errors_1.AppError("invalid_token", "Invalid reset token.", 401);
    }
    const passwordHash = await bcryptjs_1.default.hash(params.newPassword, 12);
    await (0, auth_repo_1.updatePassword)(record.user_id, passwordHash);
    await (0, auth_repo_1.incrementTokenVersion)(record.user_id);
    await (0, auth_repo_1.revokeRefreshTokensForUser)(record.user_id);
    await (0, auth_repo_1.markPasswordResetUsed)(record.id);
    await (0, audit_service_1.recordAuditEvent)({
        action: "token_revoke",
        actorUserId: null,
        targetUserId: record.user_id,
        ip: params.ip,
        userAgent: params.userAgent,
        success: true,
    });
    await (0, audit_service_1.recordAuditEvent)({
        action: "password_reset_completed",
        actorUserId: null,
        targetUserId: record.user_id,
        ip: params.ip,
        userAgent: params.userAgent,
        success: true,
    });
}
async function unlockUserAccount(params) {
    const user = await (0, auth_repo_1.findAuthUserById)(params.userId);
    if (!user) {
        await (0, audit_service_1.recordAuditEvent)({
            action: "account_unlock",
            actorUserId: params.actorUserId,
            targetUserId: params.userId,
            ip: params.ip,
            userAgent: params.userAgent,
            success: false,
        });
        throw new errors_1.AppError("not_found", "User not found.", 404);
    }
    await (0, auth_repo_1.resetLoginFailures)(params.userId);
    await (0, audit_service_1.recordAuditEvent)({
        action: "account_unlock",
        actorUserId: params.actorUserId,
        targetUserId: params.userId,
        ip: params.ip,
        userAgent: params.userAgent,
        success: true,
    });
}
function msToSeconds(value) {
    if (value.endsWith("ms")) {
        return Math.floor(Number(value.replace("ms", "")) / 1000);
    }
    const unit = value.slice(-1);
    const amount = Number(value.slice(0, -1));
    if (Number.isNaN(amount)) {
        return 0;
    }
    switch (unit) {
        case "s":
            return amount;
        case "m":
            return amount * 60;
        case "h":
            return amount * 60 * 60;
        case "d":
            return amount * 60 * 60 * 24;
        default:
            return amount;
    }
}
