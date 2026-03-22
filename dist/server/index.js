"use strict";
// src/server/index.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.server = void 0;
exports.startServer = startServer;
const env_1 = require("./config/env");
const logger_1 = require("./utils/logger");
const startupState_1 = require("../startupState");
const createServer_1 = require("./createServer");
const db_1 = require("../db");
const socket_server_1 = require("../modules/ai/socket.server");
const validateStartup_1 = require("../startup/validateStartup");
const otpCleanup_1 = require("../jobs/otpCleanup");
const createOtpSessions_1 = require("../db/migrations/createOtpSessions");
const migrationRunner_1 = require("../db/migrationRunner");
const runMigrations_1 = require("../startup/runMigrations");
const db_2 = require("../db");
const dbHealth_1 = require("../health/dbHealth");
const selfTest_1 = require("../_internal/selfTest");
let processHandlersInstalled = false;
let server = null;
exports.server = server;
let app = null;
const isTestMode = process.env.TEST_MODE === "true";
function installProcessHandlers() {
    if (processHandlersInstalled)
        return;
    processHandlersInstalled = true;
    process.on("unhandledRejection", (err) => {
        logger_1.logger.error("unhandled_rejection", { err: err instanceof Error ? err.message : String(err) });
    });
    process.on("uncaughtException", (err) => {
        logger_1.logger.error("uncaught_exception", { err: err instanceof Error ? err.message : String(err) });
    });
}
function registerOtpCleanupJob() {
    if (isTestMode) {
        logger_1.logger.info("otp_cleanup_skipped_test_mode");
        return;
    }
    const timer = setInterval(() => {
        (0, otpCleanup_1.cleanupOtpSessions)(db_1.db).catch((err) => {
            logger_1.logger.error("otp_cleanup_failed", {
                err: err instanceof Error ? err.message : String(err),
            });
        });
    }, 600000);
    if (typeof timer.unref === "function") {
        timer.unref();
    }
}
function resolvePort() {
    const rawPort = process.env.PORT;
    if (!rawPort) {
        logger_1.logger.warn("port_missing_defaulting", { fallback: 3000 });
        return 3000;
    }
    const port = Number(rawPort);
    if (Number.isNaN(port)) {
        logger_1.logger.warn("port_invalid_defaulting", { value: rawPort, fallback: 3000 });
        return 3000;
    }
    return port;
}
async function startServer() {
    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL missing");
    }
    console.log("DB CONNECTED:", process.env.DATABASE_URL);
    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET missing");
    }
    installProcessHandlers();
    (0, validateStartup_1.validateStartup)();
    (0, env_1.validateServerEnv)();
    await (0, dbHealth_1.assertDatabaseHealthy)();
    if (process.env.RUN_DB_MIGRATIONS === "true") {
        console.log("Running database migrations...");
        await (0, migrationRunner_1.runMigrations)();
    }
    await (0, runMigrations_1.runMigrations)(db_2.pool);
    app = await (0, createServer_1.createServer)();
    await (0, createOtpSessions_1.createOtpSessionsTable)();
    registerOtpCleanupJob();
    const listRoutes = (expressApp) => {
        console.log("\n=== REGISTERED ROUTES ===");
        expressApp?._router?.stack
            ?.filter((r) => r.route)
            ?.forEach((r) => {
            const methods = Object.keys(r.route.methods).join(",").toUpperCase();
            console.log(`${methods} ${r.route.path}`);
        });
        console.log("=========================\n");
    };
    setTimeout(() => {
        try {
            if (app) {
                listRoutes(app);
            }
        }
        catch (e) {
            console.error("Route listing failed", e);
        }
    }, 1000);
    const port = resolvePort();
    exports.server = server = await new Promise((resolve) => {
        if (!app) {
            throw new Error("Server failed to initialize.");
        }
        const listener = app.listen(port, "0.0.0.0", () => {
            if (typeof app?.set === "function") {
                app.set("port", port);
                app.set("server", listener);
            }
            logger_1.logger.info("server_listening", { port });
            console.log(`Server running on port ${port}`);
            void (0, selfTest_1.runSelfTest)(port);
            resolve(listener);
        });
    });
    if (!server)
        throw new Error("Server failed to start.");
    if (!isTestMode) {
        (0, socket_server_1.initChatSocket)(server);
    }
    (0, startupState_1.markReady)();
    return server;
}
process.on("SIGTERM", async () => {
    logger_1.logger.info("server_shutting_down");
    if (server) {
        await new Promise((resolve, reject) => {
            server?.close((err) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        });
    }
    process.exit(0);
});
if (require.main === module && process.env.NODE_ENV !== "test") {
    startServer().catch((err) => {
        logger_1.logger.error("server_start_failed", { err: err instanceof Error ? err.message : String(err) });
    });
}
